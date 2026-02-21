import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  supabaseAdmin: {},
}));

vi.mock("@/lib/share-service", () => ({
  createShareService: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { createShareService } from "@/lib/share-service";
import { POST, DELETE } from "../route";

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = { board_id: "board-abc-123", access_level: "view" };

describe("POST /api/share — schema cache error handling (AC6.2, AC6.5)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("when the share service throws a schema cache error", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ userId: "test-user" } as Awaited<
        ReturnType<typeof auth>
      >);

      vi.mocked(createShareService).mockReturnValue({
        createShare: vi
          .fn()
          .mockRejectedValue(
            new Error(
              "Failed to create share: Could not find the table 'public.board_shares' in the schema cache"
            )
          ),
        deleteShare: vi.fn(),
        listShares: vi.fn(),
        validateToken: vi.fn(),
      });
    });

    it("returns 503 (not 500) when the error contains 'schema cache'", async () => {
      const response = await POST(makeRequest(VALID_BODY));
      expect(response.status).toBe(503);
    });

    it("returns code SCHEMA_NOT_READY in the response body", async () => {
      const response = await POST(makeRequest(VALID_BODY));
      const body = (await response.json()) as Record<string, unknown>;
      expect(body.code).toBe("SCHEMA_NOT_READY");
    });

    it("returns a user-friendly error message", async () => {
      const response = await POST(makeRequest(VALID_BODY));
      const body = (await response.json()) as Record<string, unknown>;
      expect(typeof body.error).toBe("string");
      expect(body.error).toMatch(/board sharing|migration|not available/i);
    });

    it("does NOT leak the raw Supabase error message", async () => {
      const response = await POST(makeRequest(VALID_BODY));
      const body = (await response.json()) as Record<string, unknown>;
      expect(JSON.stringify(body)).not.toContain("schema cache");
      expect(JSON.stringify(body)).not.toContain("public.board_shares");
    });
  });

  describe("when the share service throws a non-schema-cache error", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ userId: "test-user" } as Awaited<
        ReturnType<typeof auth>
      >);

      vi.mocked(createShareService).mockReturnValue({
        createShare: vi
          .fn()
          .mockRejectedValue(new Error("Failed to create share: permission denied")),
        deleteShare: vi.fn(),
        listShares: vi.fn(),
        validateToken: vi.fn(),
      });
    });

    it("still returns 500 for generic errors", async () => {
      const response = await POST(makeRequest(VALID_BODY));
      expect(response.status).toBe(500);
    });

    it("does NOT return code SCHEMA_NOT_READY for generic errors", async () => {
      const response = await POST(makeRequest(VALID_BODY));
      const body = (await response.json()) as Record<string, unknown>;
      expect(body.code).not.toBe("SCHEMA_NOT_READY");
    });
  });

  describe("unauthenticated request", () => {
    it("returns 401 when userId is missing", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as Awaited<ReturnType<typeof auth>>);
      const response = await POST(makeRequest(VALID_BODY));
      expect(response.status).toBe(401);
    });
  });

  describe("POST — invalid request body", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ userId: "test-user" } as Awaited<
        ReturnType<typeof auth>
      >);
    });

    it("returns 400 when board_id is missing", async () => {
      const response = await POST(makeRequest({ access_level: "view" }));
      expect(response.status).toBe(400);
    });

    it("returns 400 when access_level is missing", async () => {
      const response = await POST(makeRequest({ board_id: "board-abc-123" }));
      expect(response.status).toBe(400);
    });

    it("returns 400 when access_level is an invalid value", async () => {
      const response = await POST(
        makeRequest({ board_id: "board-abc-123", access_level: "admin" })
      );
      expect(response.status).toBe(400);
    });

    it("returns 400 when board_id is an empty string", async () => {
      const response = await POST(makeRequest({ board_id: "", access_level: "view" }));
      expect(response.status).toBe(400);
    });

    it("returns 400 when the body is not an object", async () => {
      const req = new Request("http://localhost/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("string-not-object"),
      });
      const response = await POST(req);
      expect(response.status).toBe(400);
    });
  });

  describe("POST — successful creation", () => {
    it("returns 201 on success", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: "test-user" } as Awaited<
        ReturnType<typeof auth>
      >);
      vi.mocked(createShareService).mockReturnValue({
        createShare: vi.fn().mockResolvedValue({
          id: "share-1",
          board_id: "board-abc-123",
          access_level: "view",
          token: "tok-1",
          created_by: "test-user",
          created_at: "2026-01-01T00:00:00Z",
          expires_at: null,
        }),
        deleteShare: vi.fn(),
        listShares: vi.fn(),
        validateToken: vi.fn(),
      });
      const response = await POST(makeRequest(VALID_BODY));
      expect(response.status).toBe(201);
    });
  });
});

describe("DELETE /api/share — handler tests", () => {
  const VALID_DELETE_BODY = { share_id: "11111111-1111-1111-1111-111111111111" };

  function makeDeleteRequest(body: Record<string, unknown>): Request {
    return new Request("http://localhost/api/share", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("unauthenticated", () => {
    it("returns 401 when userId is null", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as Awaited<ReturnType<typeof auth>>);
      const response = await DELETE(makeDeleteRequest(VALID_DELETE_BODY));
      expect(response.status).toBe(401);
    });
  });

  describe("invalid body", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ userId: "test-user" } as Awaited<
        ReturnType<typeof auth>
      >);
    });

    it("returns 400 when share_id is missing", async () => {
      const response = await DELETE(makeDeleteRequest({}));
      expect(response.status).toBe(400);
    });

    it("returns 400 when share_id is not a UUID", async () => {
      const response = await DELETE(makeDeleteRequest({ share_id: "not-a-uuid" }));
      expect(response.status).toBe(400);
    });

    it("response body includes details when validation fails", async () => {
      const response = await DELETE(makeDeleteRequest({ share_id: "bad" }));
      const body = (await response.json()) as Record<string, unknown>;
      expect(body.details).toBeDefined();
    });
  });

  describe("successful deletion", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ userId: "test-user" } as Awaited<
        ReturnType<typeof auth>
      >);
      vi.mocked(createShareService).mockReturnValue({
        createShare: vi.fn(),
        deleteShare: vi.fn().mockResolvedValue(undefined),
        listShares: vi.fn(),
        validateToken: vi.fn(),
      });
    });

    it("returns 200 with success: true", async () => {
      const response = await DELETE(makeDeleteRequest(VALID_DELETE_BODY));
      expect(response.status).toBe(200);
      const body = (await response.json()) as Record<string, unknown>;
      expect(body.success).toBe(true);
    });

    it("calls deleteShare with the correct share_id and userId", async () => {
      await DELETE(makeDeleteRequest(VALID_DELETE_BODY));
      const mockedService = vi.mocked(createShareService).mock.results[0].value as {
        deleteShare: ReturnType<typeof vi.fn>;
      };
      expect(mockedService.deleteShare).toHaveBeenCalledWith(
        VALID_DELETE_BODY.share_id,
        "test-user"
      );
    });
  });

  describe("DELETE — schema cache error handling", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ userId: "test-user" } as Awaited<
        ReturnType<typeof auth>
      >);
      vi.mocked(createShareService).mockReturnValue({
        createShare: vi.fn(),
        deleteShare: vi
          .fn()
          .mockRejectedValue(
            new Error("Could not find the table 'public.board_shares' in the schema cache")
          ),
        listShares: vi.fn(),
        validateToken: vi.fn(),
      });
    });

    it("returns 503 for schema cache errors on DELETE", async () => {
      const response = await DELETE(makeDeleteRequest(VALID_DELETE_BODY));
      expect(response.status).toBe(503);
    });

    it("returns code SCHEMA_NOT_READY on DELETE schema cache error", async () => {
      const response = await DELETE(makeDeleteRequest(VALID_DELETE_BODY));
      const body = (await response.json()) as Record<string, unknown>;
      expect(body.code).toBe("SCHEMA_NOT_READY");
    });

    it("does not leak raw Supabase error in DELETE response", async () => {
      const response = await DELETE(makeDeleteRequest(VALID_DELETE_BODY));
      const body = (await response.json()) as Record<string, unknown>;
      expect(JSON.stringify(body)).not.toContain("schema cache");
    });
  });

  describe("DELETE — generic error", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ userId: "test-user" } as Awaited<
        ReturnType<typeof auth>
      >);
      vi.mocked(createShareService).mockReturnValue({
        createShare: vi.fn(),
        deleteShare: vi
          .fn()
          .mockRejectedValue(new Error("permission denied for table board_shares")),
        listShares: vi.fn(),
        validateToken: vi.fn(),
      });
    });

    it("returns 500 for generic errors on DELETE", async () => {
      const response = await DELETE(makeDeleteRequest(VALID_DELETE_BODY));
      expect(response.status).toBe(500);
    });
  });
});

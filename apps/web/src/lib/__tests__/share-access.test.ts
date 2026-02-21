import { describe, it, expect, vi } from "vitest";
import { validateShareToken, isReadOnlyAccess } from "@/lib/share-access";

type FetchFn = (url: string, init: RequestInit) => Promise<Response>;

function createMockFetch(status: number, body: Record<string, unknown>): FetchFn {
  return vi.fn<FetchFn>().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

describe("validateShareToken", () => {
  describe("valid token", () => {
    it("returns valid with view access", async () => {
      const mockFetch = createMockFetch(200, {
        valid: true,
        board_id: "board-123",
        access_level: "view",
      });

      const result = await validateShareToken("valid-token-123", mockFetch);

      expect(result.valid).toBe(true);
      expect(result.boardId).toBe("board-123");
      expect(result.accessLevel).toBe("view");
    });

    it("returns valid with edit access", async () => {
      const mockFetch = createMockFetch(200, {
        valid: true,
        board_id: "board-456",
        access_level: "edit",
      });

      const result = await validateShareToken("valid-token-456", mockFetch);

      expect(result.valid).toBe(true);
      expect(result.boardId).toBe("board-456");
      expect(result.accessLevel).toBe("edit");
    });

    it("calls fetch with correct URL and body", async () => {
      const mockFetch = createMockFetch(200, {
        valid: true,
        board_id: "board-123",
        access_level: "view",
      });

      await validateShareToken("test-token", mockFetch);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/share/validate",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({ token: "test-token" }),
        })
      );
    });
  });

  describe("invalid token", () => {
    it("returns invalid when server responds with 404", async () => {
      const mockFetch = createMockFetch(404, { valid: false });

      const result = await validateShareToken("bad-token", mockFetch);

      expect(result.valid).toBe(false);
      expect(result.boardId).toBeNull();
      expect(result.accessLevel).toBeNull();
    });

    it("returns invalid when server responds with valid: false", async () => {
      const mockFetch = createMockFetch(200, { valid: false });

      const result = await validateShareToken("expired-token", mockFetch);

      expect(result.valid).toBe(false);
      expect(result.boardId).toBeNull();
      expect(result.accessLevel).toBeNull();
    });
  });

  describe("network error", () => {
    it("returns invalid when fetch throws", async () => {
      const mockFetch = vi.fn<FetchFn>().mockRejectedValue(new Error("Network error"));

      const result = await validateShareToken("any-token", mockFetch);

      expect(result.valid).toBe(false);
      expect(result.boardId).toBeNull();
      expect(result.accessLevel).toBeNull();
    });
  });

  describe("empty token", () => {
    it("returns invalid without calling fetch for empty string", async () => {
      const mockFetch = vi.fn<FetchFn>();

      const result = await validateShareToken("", mockFetch);

      expect(result.valid).toBe(false);
      expect(result.boardId).toBeNull();
      expect(result.accessLevel).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});

describe("isReadOnlyAccess", () => {
  it("returns true for 'view'", () => {
    expect(isReadOnlyAccess("view")).toBe(true);
  });

  it("returns false for 'edit'", () => {
    expect(isReadOnlyAccess("edit")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isReadOnlyAccess(null)).toBe(false);
  });
});

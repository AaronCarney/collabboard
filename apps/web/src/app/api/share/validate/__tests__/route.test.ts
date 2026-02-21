import { describe, it, expect, vi, beforeEach } from "vitest";

const mockValidateToken = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase-server", () => ({
  supabaseAdmin: {},
}));

vi.mock("@/lib/share-service", () => ({
  createShareService: () => ({
    createShare: vi.fn(),
    deleteShare: vi.fn(),
    listShares: vi.fn(),
    validateToken: mockValidateToken,
  }),
}));

import { POST } from "../route";

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/share/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("POST /api/share/validate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns valid: true with board_id and access_level for a valid token", async () => {
    mockValidateToken.mockResolvedValue({
      board_id: "board-abc",
      access_level: "view",
    });

    const res = await POST(makeRequest({ token: VALID_UUID }));
    const data = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(data.valid).toBe(true);
    expect(data.board_id).toBe("board-abc");
    expect(data.access_level).toBe("view");
  });

  it("returns 404 with error for an invalid token", async () => {
    mockValidateToken.mockResolvedValue(null);

    const res = await POST(makeRequest({ token: VALID_UUID }));
    const data = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(404);
    expect(data.error).toBeDefined();
  });

  it("returns 400 for non-UUID token format", async () => {
    const res = await POST(makeRequest({ token: "not-a-uuid" }));

    expect(res.status).toBe(400);
  });
});

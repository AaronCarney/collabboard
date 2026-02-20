import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---- Mocks ----

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: (): unknown => mockAuth(),
}));

const mockFrom = vi.fn();
const mockChannel = vi.fn();
const mockRemoveChannel = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]): unknown => mockFrom(...args),
    channel: (...args: unknown[]): unknown => mockChannel(...args),
    removeChannel: (...args: unknown[]): unknown => mockRemoveChannel(...args),
  },
}));

vi.mock("@/lib/ai/command-router", () => ({
  routeCommand: vi.fn().mockResolvedValue({
    objects: [],
    message: "Done",
    tokensUsed: 10,
    latencyMs: 100,
    isTemplate: false,
  }),
}));

const BOARD_ID = "11111111-1111-1111-1111-111111111111";
const OWNER_ID = "user-owner";
const OTHER_USER_ID = "user-other";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/ai/command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupBoardQuery(board: { id: string; created_by: string } | null): void {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: board, error: null }),
  };
  // First call: boards query (select id, created_by)
  // Second call: board_objects query (select *)
  const objectsChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    upsert: vi.fn().mockResolvedValue({ error: null }),
  };

  mockFrom.mockImplementation((table: string) => {
    if (table === "boards") {
      return chain;
    }
    if (table === "board_objects") {
      return objectsChain;
    }
    return chain;
  });
}

describe("POST /api/ai/command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const { POST } = await import("../route");
    const res = await POST(makeRequest({ boardId: BOARD_ID, command: "test" }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.code).toBe("AUTH_ERROR");
  });

  it("returns 404 when board does not exist", async () => {
    mockAuth.mockResolvedValue({ userId: OWNER_ID });
    setupBoardQuery(null);

    const { POST } = await import("../route");
    const res = await POST(makeRequest({ boardId: BOARD_ID, command: "test" }));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.code).toBe("BOARD_NOT_FOUND");
  });

  it("returns 403 when user is not the board owner", async () => {
    mockAuth.mockResolvedValue({ userId: OTHER_USER_ID });
    setupBoardQuery({ id: BOARD_ID, created_by: OWNER_ID });

    const { POST } = await import("../route");
    const res = await POST(makeRequest({ boardId: BOARD_ID, command: "test" }));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.code).toBe("AUTH_ERROR");
    expect(json.error).toContain("permission");
  });

  it("returns 200 when user is the board owner", async () => {
    mockAuth.mockResolvedValue({ userId: OWNER_ID });
    setupBoardQuery({ id: BOARD_ID, created_by: OWNER_ID });

    const { POST } = await import("../route");
    const res = await POST(makeRequest({ boardId: BOARD_ID, command: "test" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("returns 400 for invalid request body", async () => {
    mockAuth.mockResolvedValue({ userId: OWNER_ID });

    const { POST } = await import("../route");
    const res = await POST(makeRequest({ boardId: "not-a-uuid", command: "" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("INVALID_COMMAND");
  });
});

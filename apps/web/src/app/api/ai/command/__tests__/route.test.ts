import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { routeCommand as RouteCommandFn } from "@/lib/ai/command-router";

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

const mockRouteCommand = vi.fn();
vi.mock("@/lib/ai/command-router", () => ({
  routeCommand: (...args: unknown[]): unknown => mockRouteCommand(...args),
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

function defaultRouteResult(): Awaited<ReturnType<typeof RouteCommandFn>> {
  return {
    objects: [],
    message: "Done",
    tokensUsed: 10,
    latencyMs: 100,
    isTemplate: false,
  };
}

function setupBoardQuery(
  board: { id: string; created_by: string } | null,
  options?: { boardError?: { code: string; message: string }; objectsError?: { message: string } }
): void {
  const boardError =
    options?.boardError ?? (board ? null : { code: "PGRST116", message: "not found" });
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: board, error: boardError }),
  };
  const objectsChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({
      data: options?.objectsError ? null : [],
      error: options?.objectsError ?? null,
    }),
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

function setupBroadcastChannel(subscribeStatus: string = "SUBSCRIBED"): {
  send: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
} {
  const mockSend = vi.fn().mockResolvedValue("ok");
  const mockSubscribe = vi.fn().mockImplementation((cb: (status: string) => void) => {
    // Call back asynchronously to simulate real behavior
    setTimeout(() => {
      cb(subscribeStatus);
    }, 0);
    return { send: mockSend };
  });

  mockChannel.mockReturnValue({ subscribe: mockSubscribe, send: mockSend });
  mockRemoveChannel.mockResolvedValue(undefined);

  return { send: mockSend, subscribe: mockSubscribe };
}

describe("POST /api/ai/command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRouteCommand.mockResolvedValue(defaultRouteResult());
  });

  // ---- Auth ----

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const { POST } = await import("../route");
    const res = await POST(makeRequest({ boardId: BOARD_ID, command: "test" }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.code).toBe("AUTH_ERROR");
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

  // ---- Validation ----

  it("returns 400 for invalid request body", async () => {
    mockAuth.mockResolvedValue({ userId: OWNER_ID });

    const { POST } = await import("../route");
    const res = await POST(makeRequest({ boardId: "not-a-uuid", command: "" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("INVALID_COMMAND");
  });

  // ---- Database errors ----

  it("returns 404 when board does not exist", async () => {
    mockAuth.mockResolvedValue({ userId: OWNER_ID });
    setupBoardQuery(null);

    const { POST } = await import("../route");
    const res = await POST(makeRequest({ boardId: BOARD_ID, command: "test" }));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.code).toBe("BOARD_NOT_FOUND");
  });

  it("returns 500 when board query has a database error", async () => {
    mockAuth.mockResolvedValue({ userId: OWNER_ID });
    setupBoardQuery(null, { boardError: { code: "PGRST000", message: "connection refused" } });

    const { POST } = await import("../route");
    const res = await POST(makeRequest({ boardId: BOARD_ID, command: "test" }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.code).toBe("DB_ERROR");
  });

  it("returns 500 when board_objects query fails", async () => {
    mockAuth.mockResolvedValue({ userId: OWNER_ID });
    setupBoardQuery(
      { id: BOARD_ID, created_by: OWNER_ID },
      { objectsError: { message: "timeout" } }
    );

    const { POST } = await import("../route");
    const res = await POST(makeRequest({ boardId: BOARD_ID, command: "test" }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.code).toBe("DB_ERROR");
  });

  // ---- Broadcast ----

  it("broadcasts to channel when result has objects", async () => {
    mockAuth.mockResolvedValue({ userId: OWNER_ID });
    setupBoardQuery({ id: BOARD_ID, created_by: OWNER_ID });
    const { send } = setupBroadcastChannel("SUBSCRIBED");

    const testObjects = [{ id: "obj-1", type: "sticky_note" }];
    mockRouteCommand.mockResolvedValue({ ...defaultRouteResult(), objects: testObjects });

    const { POST } = await import("../route");
    const res = await POST(makeRequest({ boardId: BOARD_ID, command: "test" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockChannel).toHaveBeenCalledWith(`board:${BOARD_ID}`);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "broadcast",
        event: "ai:result",
        payload: { objects: testObjects, userId: OWNER_ID },
      })
    );
    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it("returns 200 even when broadcast fails (non-fatal)", async () => {
    mockAuth.mockResolvedValue({ userId: OWNER_ID });
    setupBoardQuery({ id: BOARD_ID, created_by: OWNER_ID });
    setupBroadcastChannel("CHANNEL_ERROR");

    mockRouteCommand.mockResolvedValue({ ...defaultRouteResult(), objects: [{ id: "obj-1" }] });

    const { POST } = await import("../route");
    const res = await POST(makeRequest({ boardId: BOARD_ID, command: "test" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    // Channel should still be cleaned up via finally
    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it("cleans up channel even on subscribe rejection", async () => {
    mockAuth.mockResolvedValue({ userId: OWNER_ID });
    setupBoardQuery({ id: BOARD_ID, created_by: OWNER_ID });
    setupBroadcastChannel("TIMED_OUT");

    mockRouteCommand.mockResolvedValue({ ...defaultRouteResult(), objects: [{ id: "obj-1" }] });

    const { POST } = await import("../route");
    await POST(makeRequest({ boardId: BOARD_ID, command: "test" }));

    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  // ---- Error handling ----

  it("returns generic error message (not raw err.message) when routeCommand throws", async () => {
    mockAuth.mockResolvedValue({ userId: OWNER_ID });
    setupBoardQuery({ id: BOARD_ID, created_by: OWNER_ID });
    mockRouteCommand.mockRejectedValue(new Error("OpenAI API key invalid: sk-abc..."));

    const { POST } = await import("../route");
    const res = await POST(makeRequest({ boardId: BOARD_ID, command: "test" }));
    const json = await res.json();

    expect(res.status).toBe(500);
    // Must NOT contain the raw error message (security: info disclosure)
    expect(json.error).not.toContain("OpenAI");
    expect(json.error).not.toContain("sk-abc");
    // Should contain a user-friendly message
    expect(typeof json.error).toBe("string");
    expect(json.error.length).toBeGreaterThan(10);
  });

  it("returns 'service_unavailable' category for 429 rate limit errors", async () => {
    mockAuth.mockResolvedValue({ userId: OWNER_ID });
    setupBoardQuery({ id: BOARD_ID, created_by: OWNER_ID });
    mockRouteCommand.mockRejectedValue(Object.assign(new Error("rate limited"), { status: 429 }));

    const { POST } = await import("../route");
    const res = await POST(makeRequest({ boardId: BOARD_ID, command: "test" }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.code).toBe("SERVICE_UNAVAILABLE");
  });

  it("rejects NaN viewport coordinates with 400", async () => {
    mockAuth.mockResolvedValue({ userId: OWNER_ID });

    const { POST } = await import("../route");
    const res = await POST(
      makeRequest({
        boardId: BOARD_ID,
        command: "test",
        context: { viewportCenter: { x: NaN, y: 100 } },
      })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("INVALID_COMMAND");
  });

  it("rejects Infinity viewport coordinates with 400", async () => {
    mockAuth.mockResolvedValue({ userId: OWNER_ID });

    const { POST } = await import("../route");
    const res = await POST(
      makeRequest({
        boardId: BOARD_ID,
        command: "test",
        context: { viewportCenter: { x: Infinity, y: 100 } },
      })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("INVALID_COMMAND");
  });
});

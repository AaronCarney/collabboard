import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { BoardObject } from "@/types/board";
import { OBJECT_DEFAULTS } from "@/types/board";

// ─────────────────────────────────────────────────────────────
// Mock Supabase — use vi.hoisted so mocks are available when
// vi.mock factories run (vi.mock is hoisted above all imports)
// ─────────────────────────────────────────────────────────────
const {
  mockFrom,
  mockSelect,
  mockEq,
  mockInsert,
  mockUpdate,
  mockDelete,
  mockChannel,
  _mockChannelSend,
  mockRemoveChannel,
  _mockSubscribe,
  _mockTrack,
  // Realtime-only client mocks
  mockRealtimeChannel,
  mockRealtimeChannelSend,
  mockRealtimeRemoveChannel,
} = vi.hoisted(() => {
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();

  const mockFrom = vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
  }));

  mockSelect.mockReturnValue({ eq: mockEq });
  mockEq.mockResolvedValue({ data: [], error: null });
  mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) });
  mockDelete.mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) });

  const mockChannelSend = vi.fn().mockResolvedValue("ok");
  const mockTrack = vi.fn().mockResolvedValue("ok");
  const mockSubscribe = vi.fn((cb?: (status: string) => void) => {
    if (cb) cb("SUBSCRIBED");
    return { track: mockTrack };
  });

  const mockChannel = vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: mockSubscribe,
    send: mockChannelSend,
    track: mockTrack,
    presenceState: vi.fn().mockReturnValue({}),
  }));

  const mockRemoveChannel = vi.fn();

  // Separate mocks for the realtime-only client
  const mockRealtimeChannelSend = vi.fn().mockResolvedValue("ok");
  const mockRealtimeTrack = vi.fn().mockResolvedValue("ok");
  const mockRealtimeSubscribe = vi.fn((cb?: (status: string) => void) => {
    if (cb) cb("SUBSCRIBED");
    return { track: mockRealtimeTrack };
  });

  const mockRealtimeChannel = vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: mockRealtimeSubscribe,
    send: mockRealtimeChannelSend,
    track: mockRealtimeTrack,
    presenceState: vi.fn().mockReturnValue({}),
  }));

  const mockRealtimeRemoveChannel = vi.fn();

  return {
    mockFrom,
    mockSelect,
    mockEq,
    mockInsert,
    mockUpdate,
    mockDelete,
    mockChannel,
    mockChannelSend,
    mockRemoveChannel,
    mockSubscribe,
    mockTrack,
    mockRealtimeChannel,
    mockRealtimeChannelSend,
    mockRealtimeRemoveChannel,
  };
});

vi.mock("uuid", () => ({
  v4: vi.fn(() => "mock-uuid-1234"),
}));

// Import after mocks are set up
import { useBoardStore } from "../board-store";
import type { SupabaseClient } from "@supabase/supabase-js";

/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any */
const mockSupabase = {
  from: (table: any) => mockFrom(table),
  channel: (name: any, opts?: any) => mockChannel(name, opts),
  removeChannel: (ch: any) => mockRemoveChannel(ch),
} as unknown as SupabaseClient;

const mockRealtimeSupabase = {
  from: vi.fn(() => {
    throw new Error("Realtime client should not be used for REST");
  }),
  channel: (name: any, opts?: any) => mockRealtimeChannel(name, opts),
  removeChannel: (ch: any) => mockRealtimeRemoveChannel(ch),
} as unknown as SupabaseClient;
/* eslint-enable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any */

beforeEach(() => {
  vi.clearAllMocks();
  mockSelect.mockReturnValue({ eq: mockEq });
  mockEq.mockResolvedValue({ data: [], error: null });
  mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) });
  mockDelete.mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) });
});

// ─────────────────────────────────────────────────────────────
// Initial state
// ─────────────────────────────────────────────────────────────
describe("useBoardStore — initial state", () => {
  it("starts with empty objects", () => {
    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );
    expect(result.current.objects).toEqual([]);
  });

  it("starts with default camera at origin zoom 1", () => {
    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );
    expect(result.current.camera).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it("starts with select tool active", () => {
    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );
    expect(result.current.activeTool).toBe("select");
  });

  it("starts with nothing selected", () => {
    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );
    expect(result.current.selectedIds).toEqual([]);
  });

  it("assigns a deterministic user color based on userId", () => {
    const { result: r1 } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );
    const { result: r2 } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );
    expect(r1.current.userColor).toBe(r2.current.userColor);
    expect(r1.current.userColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("assigns different colors to different users", () => {
    const { result: r1 } = renderHook(() =>
      useBoardStore("board-1", "user-aaa", "Alice", mockSupabase, mockRealtimeSupabase)
    );
    const { result: r2 } = renderHook(() =>
      useBoardStore("board-1", "user-zzz", "Bob", mockSupabase, mockRealtimeSupabase)
    );
    // Not guaranteed but very likely with different user IDs
    // If this flakes, the hash function has poor distribution
    expect(r1.current.userColor).not.toBe(r2.current.userColor);
  });
});

// ─────────────────────────────────────────────────────────────
// createObject
// ─────────────────────────────────────────────────────────────
describe("useBoardStore — createObject", () => {
  it("creates a sticky note with correct defaults", async () => {
    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    await act(async () => {
      await result.current.createObject("sticky_note", 50, 75);
    });

    expect(result.current.objects).toHaveLength(1);
    const obj = result.current.objects[0];
    expect(obj.type).toBe("sticky_note");
    expect(obj.x).toBe(50);
    expect(obj.y).toBe(75);
    expect(obj.width).toBe(OBJECT_DEFAULTS.sticky_note.width);
    expect(obj.height).toBe(OBJECT_DEFAULTS.sticky_note.height);
    expect(obj.color).toBe(OBJECT_DEFAULTS.sticky_note.color);
    expect(obj.content).toBe(OBJECT_DEFAULTS.sticky_note.content);
    expect(obj.version).toBe(1);
    expect(obj.board_id).toBe("board-1");
    expect(obj.created_by).toBe("user-1");
  });

  it("creates a circle with correct defaults", async () => {
    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    await act(async () => {
      await result.current.createObject("circle", 200, 300);
    });

    const obj = result.current.objects[0];
    expect(obj.type).toBe("circle");
    expect(obj.width).toBe(OBJECT_DEFAULTS.circle.width);
    expect(obj.height).toBe(OBJECT_DEFAULTS.circle.height);
    expect(obj.color).toBe(OBJECT_DEFAULTS.circle.color);
  });

  it("creates a rectangle with correct defaults", async () => {
    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    await act(async () => {
      await result.current.createObject("rectangle", 0, 0);
    });

    const obj = result.current.objects[0];
    expect(obj.type).toBe("rectangle");
    expect(obj.width).toBe(OBJECT_DEFAULTS.rectangle.width);
    expect(obj.height).toBe(OBJECT_DEFAULTS.rectangle.height);
    expect(obj.color).toBe(OBJECT_DEFAULTS.rectangle.color);
  });

  it("creates a text object with correct defaults", async () => {
    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    await act(async () => {
      await result.current.createObject("text", 10, 20);
    });

    const obj = result.current.objects[0];
    expect(obj.type).toBe("text");
    expect(obj.width).toBe(OBJECT_DEFAULTS.text.width);
    expect(obj.height).toBe(OBJECT_DEFAULTS.text.height);
    expect(obj.content).toBe(OBJECT_DEFAULTS.text.content);
  });

  it("persists to Supabase", async () => {
    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    await act(async () => {
      await result.current.createObject("sticky_note", 0, 0);
    });

    expect(mockFrom).toHaveBeenCalledWith("board_objects");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "sticky_note",
        board_id: "board-1",
        created_by: "user-1",
      })
    );
  });

  it("adds multiple objects to the store", async () => {
    const { v4 } = await import("uuid");
    (v4 as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce("uuid-sticky")
      .mockReturnValueOnce("uuid-rect");

    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    await act(async () => {
      await result.current.createObject("sticky_note", 0, 0);
    });
    await act(async () => {
      await result.current.createObject("rectangle", 100, 100);
    });

    expect(result.current.objects).toHaveLength(2);
    const types = result.current.objects.map((o) => o.type);
    expect(types).toContain("sticky_note");
    expect(types).toContain("rectangle");
  });
});

// ─────────────────────────────────────────────────────────────
// updateObject
// ─────────────────────────────────────────────────────────────
describe("useBoardStore — updateObject", () => {
  it("increments version on update", async () => {
    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    await act(async () => {
      await result.current.createObject("sticky_note", 0, 0);
    });

    const id = result.current.objects[0].id;

    act(() => {
      result.current.updateObject(id, { x: 50 });
    });

    expect(result.current.objects[0].version).toBe(2);
  });

  it("applies the changes to the correct object", async () => {
    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    await act(async () => {
      await result.current.createObject("sticky_note", 0, 0);
    });

    const id = result.current.objects[0].id;

    act(() => {
      result.current.updateObject(id, { x: 99, y: 88, content: "updated" });
    });

    expect(result.current.objects[0].x).toBe(99);
    expect(result.current.objects[0].y).toBe(88);
    expect(result.current.objects[0].content).toBe("updated");
  });

  it("updates the updated_at timestamp", async () => {
    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    await act(async () => {
      await result.current.createObject("sticky_note", 0, 0);
    });

    const originalTimestamp = result.current.objects[0].updated_at;

    // Small delay to ensure different timestamp
    await new Promise((resolve) => setTimeout(resolve, 10));

    act(() => {
      result.current.updateObject(result.current.objects[0].id, { x: 1 });
    });

    expect(result.current.objects[0].updated_at).not.toBe(originalTimestamp);
  });

  it("does not modify other objects", async () => {
    const { v4 } = await import("uuid");
    (v4 as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce("sticky-id")
      .mockReturnValueOnce("rect-id");

    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    await act(async () => {
      await result.current.createObject("sticky_note", 0, 0);
    });
    await act(async () => {
      await result.current.createObject("rectangle", 100, 100);
    });

    act(() => {
      result.current.updateObject("sticky-id", { x: 999 });
    });

    // Second object unchanged
    expect(result.current.objects[1].x).toBe(100);
    expect(result.current.objects[1].id).toBe("rect-id");
  });
});

// ─────────────────────────────────────────────────────────────
// deleteObject
// ─────────────────────────────────────────────────────────────
describe("useBoardStore — deleteObject", () => {
  it("removes the object from state", async () => {
    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    await act(async () => {
      await result.current.createObject("sticky_note", 0, 0);
    });

    const id = result.current.objects[0].id;

    await act(async () => {
      await result.current.deleteObject(id);
    });

    expect(result.current.objects).toHaveLength(0);
  });

  it("only removes the targeted object", async () => {
    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    // Need unique IDs — mock uuid to return different values
    const { v4 } = await import("uuid");
    (v4 as ReturnType<typeof vi.fn>).mockReturnValueOnce("id-1").mockReturnValueOnce("id-2");

    await act(async () => {
      await result.current.createObject("sticky_note", 0, 0);
    });
    await act(async () => {
      await result.current.createObject("rectangle", 100, 100);
    });

    await act(async () => {
      await result.current.deleteObject("id-1");
    });

    expect(result.current.objects).toHaveLength(1);
    expect(result.current.objects[0].id).toBe("id-2");
  });

  it("deletes from Supabase", async () => {
    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    await act(async () => {
      await result.current.createObject("sticky_note", 0, 0);
    });

    const id = result.current.objects[0].id;

    await act(async () => {
      await result.current.deleteObject(id);
    });

    expect(mockFrom).toHaveBeenCalledWith("board_objects");
    expect(mockDelete).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────
// loadObjects
// ─────────────────────────────────────────────────────────────
describe("useBoardStore — loadObjects", () => {
  it("fetches objects from Supabase filtered by boardId", async () => {
    const mockData: BoardObject[] = [
      {
        id: "11111111-1111-1111-1111-111111111111",
        board_id: "22222222-2222-2222-2222-222222222222",
        type: "sticky_note",
        x: 10,
        y: 20,
        width: 200,
        height: 200,
        rotation: 0,
        content: "Hello",
        color: "#FFEB3B",
        version: 1,
        created_by: "user-1",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        parent_frame_id: null,
        properties: {},
      } as BoardObject,
    ];

    mockEq.mockResolvedValueOnce({ data: mockData, error: null });

    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    await act(async () => {
      await result.current.loadObjects();
    });

    expect(mockFrom).toHaveBeenCalledWith("board_objects");
    expect(result.current.objects).toHaveLength(1);
    expect(result.current.objects[0].content).toBe("Hello");
  });

  it("does not crash when Supabase returns null data", async () => {
    mockEq.mockResolvedValueOnce({ data: null, error: { message: "fail" } });

    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    await act(async () => {
      await result.current.loadObjects();
    });

    // Objects remain empty — no crash
    expect(result.current.objects).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────
// subscribe
// ─────────────────────────────────────────────────────────────
describe("useBoardStore — subscribe", () => {
  it("creates a channel on the REALTIME client with the board ID", () => {
    const { result } = renderHook(() =>
      useBoardStore("board-99", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    act(() => {
      result.current.subscribe();
    });

    // Channel should be created on realtime client, not auth client
    expect(mockRealtimeChannel).toHaveBeenCalledWith("board:board-99", expect.any(Object));
    expect(mockChannel).not.toHaveBeenCalled();
  });

  it("returns a cleanup function that removes the channel from REALTIME client", () => {
    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    let cleanup: (() => void) | undefined;
    act(() => {
      cleanup = result.current.subscribe();
    });

    expect(typeof cleanup).toBe("function");
    if (cleanup) cleanup();
    expect(mockRealtimeRemoveChannel).toHaveBeenCalled();
    expect(mockRemoveChannel).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────
// Dual-client routing
// ─────────────────────────────────────────────────────────────
describe("useBoardStore — dual-client routing", () => {
  it("uses auth client for REST inserts, realtime client for broadcast", async () => {
    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    // Subscribe first to set up the channel ref
    act(() => {
      result.current.subscribe();
    });

    await act(async () => {
      await result.current.createObject("sticky_note", 10, 20);
    });

    // REST insert goes to auth client
    expect(mockFrom).toHaveBeenCalledWith("board_objects");
    expect(mockInsert).toHaveBeenCalled();

    // Broadcast goes to realtime client's channel
    expect(mockRealtimeChannelSend).toHaveBeenCalledWith(
      expect.objectContaining({ type: "broadcast", event: "object:upsert" })
    );
  });

  it("uses auth client for REST loads", async () => {
    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    await act(async () => {
      await result.current.loadObjects();
    });

    // REST select goes to auth client
    expect(mockFrom).toHaveBeenCalledWith("board_objects");
  });

  it("uses auth client for REST deletes, realtime client for broadcast", async () => {
    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    act(() => {
      result.current.subscribe();
    });

    await act(async () => {
      await result.current.createObject("sticky_note", 0, 0);
    });

    const id = result.current.objects[0].id;

    await act(async () => {
      await result.current.deleteObject(id);
    });

    // REST delete goes to auth client
    expect(mockDelete).toHaveBeenCalled();

    // Broadcast goes to realtime client's channel
    expect(mockRealtimeChannelSend).toHaveBeenCalledWith(
      expect.objectContaining({ type: "broadcast", event: "object:delete" })
    );
  });
});

// ─────────────────────────────────────────────────────────────
// moveObjects (batch position update)
// ─────────────────────────────────────────────────────────────
describe("useBoardStore — moveObjects", () => {
  it("updates positions of multiple objects in one call", async () => {
    const { v4 } = await import("uuid");
    (v4 as ReturnType<typeof vi.fn>).mockReturnValueOnce("obj-a").mockReturnValueOnce("obj-b");

    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    await act(async () => {
      await result.current.createObject("sticky_note", 0, 0);
    });
    await act(async () => {
      await result.current.createObject("rectangle", 100, 100);
    });

    act(() => {
      result.current.moveObjects([
        { id: "obj-a", x: 50, y: 60 },
        { id: "obj-b", x: 200, y: 300 },
      ]);
    });

    expect(result.current.objects[0].x).toBe(50);
    expect(result.current.objects[0].y).toBe(60);
    expect(result.current.objects[1].x).toBe(200);
    expect(result.current.objects[1].y).toBe(300);
  });

  it("increments version for each moved object", async () => {
    const { v4 } = await import("uuid");
    (v4 as ReturnType<typeof vi.fn>).mockReturnValueOnce("obj-a").mockReturnValueOnce("obj-b");

    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    await act(async () => {
      await result.current.createObject("sticky_note", 0, 0);
    });
    await act(async () => {
      await result.current.createObject("rectangle", 100, 100);
    });

    // Both start at version 1
    expect(result.current.objects[0].version).toBe(1);
    expect(result.current.objects[1].version).toBe(1);

    act(() => {
      result.current.moveObjects([
        { id: "obj-a", x: 50, y: 60 },
        { id: "obj-b", x: 200, y: 300 },
      ]);
    });

    expect(result.current.objects[0].version).toBe(2);
    expect(result.current.objects[1].version).toBe(2);
  });

  it("does not modify objects not in the moves array", async () => {
    const { v4 } = await import("uuid");
    (v4 as ReturnType<typeof vi.fn>).mockReturnValueOnce("obj-a").mockReturnValueOnce("obj-b");

    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    await act(async () => {
      await result.current.createObject("sticky_note", 0, 0);
    });
    await act(async () => {
      await result.current.createObject("rectangle", 100, 100);
    });

    act(() => {
      result.current.moveObjects([{ id: "obj-a", x: 50, y: 60 }]);
    });

    // obj-b unchanged
    expect(result.current.objects[1].x).toBe(100);
    expect(result.current.objects[1].y).toBe(100);
    expect(result.current.objects[1].version).toBe(1);
  });

  it("broadcasts and persists each moved object", async () => {
    const { v4 } = await import("uuid");
    (v4 as ReturnType<typeof vi.fn>).mockReturnValueOnce("obj-a").mockReturnValueOnce("obj-b");

    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    act(() => {
      result.current.subscribe();
    });

    await act(async () => {
      await result.current.createObject("sticky_note", 0, 0);
    });
    await act(async () => {
      await result.current.createObject("rectangle", 100, 100);
    });

    // Clear mocks from creation broadcasts
    mockRealtimeChannelSend.mockClear();
    mockUpdate.mockClear();

    act(() => {
      result.current.moveObjects(
        [
          { id: "obj-a", x: 50, y: 60 },
          { id: "obj-b", x: 200, y: 300 },
        ],
        true
      );
    });

    // Should broadcast upsert for each moved object
    expect(mockRealtimeChannelSend).toHaveBeenCalledTimes(2);
    expect(mockRealtimeChannelSend).toHaveBeenCalledWith(
      expect.objectContaining({ type: "broadcast", event: "object:upsert" })
    );

    // Should persist each moved object via REST
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });

  it("does not persist to REST when persist flag is false", async () => {
    const { v4 } = await import("uuid");
    (v4 as ReturnType<typeof vi.fn>).mockReturnValueOnce("obj-a").mockReturnValueOnce("obj-b");

    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    act(() => {
      result.current.subscribe();
    });

    await act(async () => {
      await result.current.createObject("sticky_note", 0, 0);
    });
    await act(async () => {
      await result.current.createObject("rectangle", 100, 100);
    });

    mockRealtimeChannelSend.mockClear();
    mockUpdate.mockClear();

    act(() => {
      result.current.moveObjects([
        { id: "obj-a", x: 50, y: 60 },
        { id: "obj-b", x: 200, y: 300 },
      ]);
    });

    // Still broadcasts for realtime collaboration
    expect(mockRealtimeChannelSend).toHaveBeenCalledTimes(2);

    // But does NOT persist to REST (saves DB writes during drag)
    expect(mockUpdate).not.toHaveBeenCalled();

    // State is still updated locally
    expect(result.current.objects[0].x).toBe(50);
    expect(result.current.objects[1].x).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────
// mergeObjects (local-only merge for server-side results)
// ─────────────────────────────────────────────────────────────
describe("useBoardStore — mergeObjects", () => {
  const makeObj = (overrides: Partial<BoardObject> = {}): BoardObject =>
    ({
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      board_id: "board-1",
      type: "sticky_note",
      x: 100,
      y: 200,
      width: 200,
      height: 200,
      rotation: 0,
      content: "AI note",
      color: "#FFEB3B",
      version: 1,
      created_by: "server",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      parent_frame_id: null,
      properties: {},
      ...overrides,
    }) as BoardObject;

  it("adds objects to local state", () => {
    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    act(() => {
      result.current.mergeObjects([makeObj()]);
    });

    expect(result.current.objects).toHaveLength(1);
    expect(result.current.objects[0].content).toBe("AI note");
  });

  it("does not broadcast to realtime channel", () => {
    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    // Subscribe first so channel is active
    act(() => {
      result.current.subscribe();
    });
    mockRealtimeChannelSend.mockClear();

    act(() => {
      result.current.mergeObjects([makeObj()]);
    });

    expect(mockRealtimeChannelSend).not.toHaveBeenCalled();
  });

  it("does not persist to Supabase", () => {
    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    mockFrom.mockClear();

    act(() => {
      result.current.mergeObjects([makeObj()]);
    });

    // mockFrom would be called if upsert/insert happened
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("merges multiple objects at once", () => {
    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    act(() => {
      result.current.mergeObjects([
        makeObj({ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", content: "One" }),
        makeObj({ id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", content: "Two" }),
      ]);
    });

    expect(result.current.objects).toHaveLength(2);
  });

  it("overwrites existing objects by id (last-write-wins)", async () => {
    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    await act(async () => {
      await result.current.createObject("sticky_note", 0, 0);
    });

    const existingId = result.current.objects[0].id;

    act(() => {
      result.current.mergeObjects([makeObj({ id: existingId, content: "Replaced" })]);
    });

    expect(result.current.objects).toHaveLength(1);
    expect(result.current.objects[0].content).toBe("Replaced");
  });
});

// ─────────────────────────────────────────────────────────────
// getPipeline — getObject
// ─────────────────────────────────────────────────────────────
describe("useBoardStore — getPipeline().getObject()", () => {
  it("returns an existing object by ID", async () => {
    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    await act(async () => {
      await result.current.createObject("sticky_note", 10, 20);
    });

    const id = result.current.objects[0].id;
    const pipeline = result.current.getPipeline();
    const found = pipeline.getObject(id);

    expect(found).not.toBeNull();
    expect(found?.id).toBe(id);
    expect(found?.x).toBe(10);
  });

  it("returns null for a non-existent ID", () => {
    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    const pipeline = result.current.getPipeline();
    const found = pipeline.getObject("nonexistent");

    expect(found).toBeNull();
  });

  it("reflects the latest state after mutations", async () => {
    const { result } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase, mockRealtimeSupabase)
    );

    await act(async () => {
      await result.current.createObject("sticky_note", 10, 20);
    });

    const id = result.current.objects[0].id;

    act(() => {
      result.current.updateObject(id, { x: 999 });
    });

    const pipeline = result.current.getPipeline();
    const found = pipeline.getObject(id);

    expect(found?.x).toBe(999);
  });
});

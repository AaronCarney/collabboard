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
  };
});

vi.mock("uuid", () => ({
  v4: vi.fn(() => "mock-uuid-1234"),
}));

// Import after mocks are set up
import { useBoardStore } from "../board-store";
import type { SupabaseClient } from "@supabase/supabase-js";

/* eslint-disable @typescript-eslint/no-unsafe-return */
const mockSupabase = {
  from: (...args: unknown[]) => mockFrom(...args),
  channel: (...args: unknown[]) => mockChannel(...args),
  removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
} as unknown as SupabaseClient;
/* eslint-enable @typescript-eslint/no-unsafe-return */

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
    const { result } = renderHook(() => useBoardStore("board-1", "user-1", "Alice", mockSupabase));
    expect(result.current.objects).toEqual([]);
  });

  it("starts with default camera at origin zoom 1", () => {
    const { result } = renderHook(() => useBoardStore("board-1", "user-1", "Alice", mockSupabase));
    expect(result.current.camera).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it("starts with select tool active", () => {
    const { result } = renderHook(() => useBoardStore("board-1", "user-1", "Alice", mockSupabase));
    expect(result.current.activeTool).toBe("select");
  });

  it("starts with nothing selected", () => {
    const { result } = renderHook(() => useBoardStore("board-1", "user-1", "Alice", mockSupabase));
    expect(result.current.selectedId).toBeNull();
  });

  it("assigns a deterministic user color based on userId", () => {
    const { result: r1 } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase)
    );
    const { result: r2 } = renderHook(() =>
      useBoardStore("board-1", "user-1", "Alice", mockSupabase)
    );
    expect(r1.current.userColor).toBe(r2.current.userColor);
    expect(r1.current.userColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("assigns different colors to different users", () => {
    const { result: r1 } = renderHook(() =>
      useBoardStore("board-1", "user-aaa", "Alice", mockSupabase)
    );
    const { result: r2 } = renderHook(() =>
      useBoardStore("board-1", "user-zzz", "Bob", mockSupabase)
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
    const { result } = renderHook(() => useBoardStore("board-1", "user-1", "Alice", mockSupabase));

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
    const { result } = renderHook(() => useBoardStore("board-1", "user-1", "Alice", mockSupabase));

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
    const { result } = renderHook(() => useBoardStore("board-1", "user-1", "Alice", mockSupabase));

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
    const { result } = renderHook(() => useBoardStore("board-1", "user-1", "Alice", mockSupabase));

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
    const { result } = renderHook(() => useBoardStore("board-1", "user-1", "Alice", mockSupabase));

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

  it("adds multiple objects to the array", async () => {
    const { result } = renderHook(() => useBoardStore("board-1", "user-1", "Alice", mockSupabase));

    await act(async () => {
      await result.current.createObject("sticky_note", 0, 0);
    });
    await act(async () => {
      await result.current.createObject("rectangle", 100, 100);
    });

    expect(result.current.objects).toHaveLength(2);
    expect(result.current.objects[0].type).toBe("sticky_note");
    expect(result.current.objects[1].type).toBe("rectangle");
  });
});

// ─────────────────────────────────────────────────────────────
// updateObject
// ─────────────────────────────────────────────────────────────
describe("useBoardStore — updateObject", () => {
  it("increments version on update", async () => {
    const { result } = renderHook(() => useBoardStore("board-1", "user-1", "Alice", mockSupabase));

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
    const { result } = renderHook(() => useBoardStore("board-1", "user-1", "Alice", mockSupabase));

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
    const { result } = renderHook(() => useBoardStore("board-1", "user-1", "Alice", mockSupabase));

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

    const { result } = renderHook(() => useBoardStore("board-1", "user-1", "Alice", mockSupabase));

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
    const { result } = renderHook(() => useBoardStore("board-1", "user-1", "Alice", mockSupabase));

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
    const { result } = renderHook(() => useBoardStore("board-1", "user-1", "Alice", mockSupabase));

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
    const { result } = renderHook(() => useBoardStore("board-1", "user-1", "Alice", mockSupabase));

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
        id: "obj-1",
        board_id: "board-1",
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
      },
    ];

    mockEq.mockResolvedValueOnce({ data: mockData, error: null });

    const { result } = renderHook(() => useBoardStore("board-1", "user-1", "Alice", mockSupabase));

    await act(async () => {
      await result.current.loadObjects();
    });

    expect(mockFrom).toHaveBeenCalledWith("board_objects");
    expect(result.current.objects).toHaveLength(1);
    expect(result.current.objects[0].content).toBe("Hello");
  });

  it("does not crash when Supabase returns null data", async () => {
    mockEq.mockResolvedValueOnce({ data: null, error: { message: "fail" } });

    const { result } = renderHook(() => useBoardStore("board-1", "user-1", "Alice", mockSupabase));

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
  it("creates a channel with the board ID", () => {
    const { result } = renderHook(() => useBoardStore("board-99", "user-1", "Alice", mockSupabase));

    act(() => {
      result.current.subscribe();
    });

    expect(mockChannel).toHaveBeenCalledWith("board:board-99", expect.any(Object));
  });

  it("returns a cleanup function that removes the channel", () => {
    const { result } = renderHook(() => useBoardStore("board-1", "user-1", "Alice", mockSupabase));

    let cleanup: (() => void) | undefined;
    act(() => {
      cleanup = result.current.subscribe();
    });

    expect(typeof cleanup).toBe("function");
    if (cleanup) cleanup();
    expect(mockRemoveChannel).toHaveBeenCalled();
  });
});

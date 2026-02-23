import { describe, it, expect, vi, beforeEach } from "vitest";
import { selectMode } from "../interaction-modes/select-mode";
import { panMode } from "../interaction-modes/pan-mode";
import { drawShapeMode } from "../interaction-modes/draw-shape-mode";
import type { InteractionContext, CanvasPointerEvent } from "../interaction-types";
import type { BoardObject, StickyNoteObject } from "@collabboard/shared";

function makeObj(overrides: Partial<StickyNoteObject> = {}): StickyNoteObject {
  return {
    id: "obj-1",
    board_id: "board-1",
    type: "sticky_note",
    x: 100,
    y: 100,
    width: 200,
    height: 200,
    rotation: 0,
    content: "",
    color: "#FFEB3B",
    version: 1,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    parent_frame_id: null,
    properties: {},
    ...overrides,
  };
}

function makeCtx(objects: BoardObject[] = []): InteractionContext {
  const objectMap = new Map<string, BoardObject>();
  for (const obj of objects) {
    objectMap.set(obj.id, obj);
  }
  return {
    camera: { x: 0, y: 0, zoom: 1 },
    objects: objectMap,
    selectedIds: new Set<string>(),
    mutate: vi.fn(),
    selectObjects: vi.fn(),
    getRenderer: vi.fn(() => ({
      draw: vi.fn(),
      hitTest: vi.fn((obj: BoardObject, wx: number, wy: number) => {
        return wx >= obj.x && wx <= obj.x + obj.width && wy >= obj.y && wy <= obj.y + obj.height;
      }),
      getBounds: vi.fn((obj: BoardObject) => ({
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height,
      })),
      getResizeHandles: vi.fn(() => []),
    })),
  };
}

function makeEvent(overrides: Partial<CanvasPointerEvent> = {}): CanvasPointerEvent {
  return {
    worldX: 0,
    worldY: 0,
    screenX: 0,
    screenY: 0,
    shiftKey: false,
    ctrlKey: false,
    ...overrides,
  };
}

describe("selectMode", () => {
  it("has default cursor", () => {
    expect(selectMode.cursor).toBe("default");
  });

  it("selects an object on mousedown when clicking on it", () => {
    const obj = makeObj({ id: "obj-1", x: 100, y: 100, width: 200, height: 200 });
    const ctx = makeCtx([obj]);
    const event = makeEvent({ worldX: 150, worldY: 150 });

    selectMode.onPointerDown(ctx, event);

    expect(ctx.selectObjects).toHaveBeenCalled();
  });

  it("deselects when clicking on empty space", () => {
    const obj = makeObj({ id: "obj-1", x: 100, y: 100, width: 200, height: 200 });
    const ctx = makeCtx([obj]);
    const event = makeEvent({ worldX: 50, worldY: 50 }); // outside object

    selectMode.onPointerDown(ctx, event);

    expect(ctx.selectObjects).toHaveBeenCalledWith(new Set());
  });
});

describe("panMode", () => {
  it("has grab cursor", () => {
    expect(panMode.cursor).toBe("grab");
  });

  it("onPointerDown/Move/Up do not throw", () => {
    const ctx = makeCtx();
    const event = makeEvent();

    expect(() => {
      panMode.onPointerDown(ctx, event);
      panMode.onPointerMove(ctx, event);
      panMode.onPointerUp(ctx, event);
    }).not.toThrow();
  });
});

describe("drawShapeMode", () => {
  let mode: ReturnType<typeof drawShapeMode>;

  beforeEach(() => {
    mode = drawShapeMode("sticky_note");
  });

  it("has crosshair cursor", () => {
    expect(mode.cursor).toBe("crosshair");
  });

  it("onPointerDown/Move/Up do not throw", () => {
    const ctx = makeCtx();
    const event = makeEvent({ worldX: 200, worldY: 200 });

    expect(() => {
      mode.onPointerDown(ctx, event);
      mode.onPointerMove(ctx, event);
      mode.onPointerUp(ctx, event);
    }).not.toThrow();
  });
});

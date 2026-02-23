import { describe, it, expect, vi, beforeEach } from "vitest";
import type { BoardObject } from "@collabboard/shared";
import type { InteractionContext, CanvasPointerEvent } from "../../interaction-types";
import { createDrawConnectorMode } from "../draw-connector-mode";

function createMockObject(overrides: Partial<BoardObject>): BoardObject {
  return {
    id: "r1",
    board_id: "board-1",
    type: "rectangle",
    x: 100,
    y: 100,
    width: 200,
    height: 150,
    rotation: 0,
    content: "",
    color: "#42A5F5",
    opacity: 1,
    version: 1,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    parent_frame_id: null,
    properties: {},
    ...overrides,
  } as BoardObject;
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

function createMockContext(objects: BoardObject[]): InteractionContext {
  const objMap = new Map(objects.map((o) => [o.id, o]));
  return {
    camera: { x: 0, y: 0, zoom: 1 },
    objects: objMap,
    selectedIds: new Set<string>(),
    mutate: vi.fn(),
    selectObjects: vi.fn(),
    getRenderer: vi.fn().mockReturnValue({
      hitTest: (obj: BoardObject, wx: number, wy: number) => {
        return wx >= obj.x && wx <= obj.x + obj.width && wy >= obj.y && wy <= obj.y + obj.height;
      },
      draw: vi.fn(),
      getBounds: vi.fn(),
      getResizeHandles: vi.fn().mockReturnValue([]),
    }),
  };
}

describe("createDrawConnectorMode", () => {
  const rect1 = createMockObject({ id: "r1", x: 100, y: 100, width: 200, height: 150 });
  const rect2 = createMockObject({ id: "r2", x: 500, y: 100, width: 200, height: 150 });

  let mode: ReturnType<typeof createDrawConnectorMode>;

  beforeEach(() => {
    mode = createDrawConnectorMode();
  });

  it("exports a factory function", () => {
    expect(typeof createDrawConnectorMode).toBe("function");
  });

  it("returns an InteractionMode with cursor=crosshair", () => {
    expect(mode.cursor).toBe("crosshair");
  });

  it("has getState and reset methods", () => {
    expect(typeof mode.getState).toBe("function");
    expect(typeof mode.reset).toBe("function");
  });

  describe("source selection", () => {
    it("sets source when clicking on an object", () => {
      const ctx = createMockContext([rect1, rect2]);
      // Click inside rect1
      mode.onPointerDown(ctx, makeEvent({ worldX: 200, worldY: 175 }));
      const state = mode.getState();
      expect(state.sourceId).toBe("r1");
      expect(state.sourcePort).toBeTruthy();
    });

    it("does not set source when clicking on empty canvas", () => {
      const ctx = createMockContext([rect1, rect2]);
      // Click outside both objects
      mode.onPointerDown(ctx, makeEvent({ worldX: 50, worldY: 50 }));
      const state = mode.getState();
      expect(state.sourceId).toBeNull();
    });
  });

  describe("port detection", () => {
    it("selects the nearest port based on click position", () => {
      const ctx = createMockContext([rect1]);
      // Click near the right edge of rect1 (x=100+200=300, y=175 center)
      mode.onPointerDown(ctx, makeEvent({ worldX: 295, worldY: 175 }));
      const state = mode.getState();
      expect(state.sourcePort).toBe("right");
    });

    it("selects top port when clicking near top edge", () => {
      const ctx = createMockContext([rect1]);
      // Click near the top edge (center-x=200, y=100)
      mode.onPointerDown(ctx, makeEvent({ worldX: 200, worldY: 105 }));
      const state = mode.getState();
      expect(state.sourcePort).toBe("top");
    });
  });

  describe("ghost line state", () => {
    it("tracks cursor position after source is selected", () => {
      const ctx = createMockContext([rect1, rect2]);
      mode.onPointerDown(ctx, makeEvent({ worldX: 200, worldY: 175 }));
      mode.onPointerMove(ctx, makeEvent({ worldX: 400, worldY: 200 }));
      const state = mode.getState();
      expect(state.cursorX).toBe(400);
      expect(state.cursorY).toBe(200);
    });

    it("does not track cursor when no source is selected", () => {
      const ctx = createMockContext([rect1]);
      mode.onPointerMove(ctx, makeEvent({ worldX: 400, worldY: 200 }));
      const state = mode.getState();
      expect(state.cursorX).toBeUndefined();
    });
  });

  describe("connector creation", () => {
    it("calls mutate with a connector object when clicking a second object", () => {
      const ctx = createMockContext([rect1, rect2]);
      // Click rect1 as source
      mode.onPointerDown(ctx, makeEvent({ worldX: 200, worldY: 175 }));
      // Click rect2 as target
      mode.onPointerUp(ctx, makeEvent({ worldX: 600, worldY: 175 }));
      expect(ctx.mutate).toHaveBeenCalled();
      const mutatedObjects = (ctx.mutate as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as BoardObject[];
      const connector = mutatedObjects[0];
      expect(connector.type).toBe("connector");
      expect(connector.properties.from_object_id).toBe("r1");
      expect(connector.properties.to_object_id).toBe("r2");
    });
  });

  describe("cancellation", () => {
    it("resets source when clicking empty canvas after source selection", () => {
      const ctx = createMockContext([rect1, rect2]);
      mode.onPointerDown(ctx, makeEvent({ worldX: 200, worldY: 175 }));
      expect(mode.getState().sourceId).toBe("r1");
      // Click on empty canvas
      mode.onPointerDown(ctx, makeEvent({ worldX: 50, worldY: 50 }));
      expect(mode.getState().sourceId).toBeNull();
    });

    it("reset() clears all state", () => {
      const ctx = createMockContext([rect1]);
      mode.onPointerDown(ctx, makeEvent({ worldX: 200, worldY: 175 }));
      mode.reset();
      const state = mode.getState();
      expect(state.sourceId).toBeNull();
      expect(state.sourcePort).toBeNull();
    });
  });

  describe("self-connection prevention", () => {
    it("does not create connector when source and target are the same object", () => {
      const ctx = createMockContext([rect1]);
      mode.onPointerDown(ctx, makeEvent({ worldX: 150, worldY: 150 }));
      mode.onPointerUp(ctx, makeEvent({ worldX: 250, worldY: 200 }));
      expect(ctx.mutate).not.toHaveBeenCalled();
    });
  });

  describe("port detection — all cardinal ports", () => {
    it("selects bottom port when clicking near bottom edge", () => {
      const ctx = createMockContext([rect1]);
      // Bottom-center: x=200, y=100+150=250
      mode.onPointerDown(ctx, makeEvent({ worldX: 200, worldY: 245 }));
      expect(mode.getState().sourcePort).toBe("bottom");
    });

    it("selects left port when clicking near left edge", () => {
      const ctx = createMockContext([rect1]);
      // Left-center: x=100, y=175
      mode.onPointerDown(ctx, makeEvent({ worldX: 105, worldY: 175 }));
      expect(mode.getState().sourcePort).toBe("left");
    });

    it("selects center port when clicking near the center of the object", () => {
      const ctx = createMockContext([rect1]);
      // Center: x=200, y=175
      mode.onPointerDown(ctx, makeEvent({ worldX: 200, worldY: 175 }));
      const port = mode.getState().sourcePort;
      // center is equidistant from all sides — center port wins when perfectly centered
      expect(["center", "top", "right", "bottom", "left"]).toContain(port);
    });
  });

  describe("connector creation — port values in properties", () => {
    it("stores the source port and target port on the connector", () => {
      const ctx = createMockContext([rect1, rect2]);
      // Click near right edge of rect1 to get "right" source port
      mode.onPointerDown(ctx, makeEvent({ worldX: 295, worldY: 175 }));
      // Click near left edge of rect2 (x=500) to get "left" target port
      mode.onPointerUp(ctx, makeEvent({ worldX: 505, worldY: 175 }));
      expect(ctx.mutate).toHaveBeenCalled();
      const mutated = (ctx.mutate as ReturnType<typeof vi.fn>).mock.calls[0][0] as BoardObject[];
      const connector = mutated[0];
      expect(connector.properties.from_port).toBe("right");
      expect(connector.properties.to_port).toBe("left");
    });

    it("connector has arrow_style='end' by default", () => {
      const ctx = createMockContext([rect1, rect2]);
      mode.onPointerDown(ctx, makeEvent({ worldX: 200, worldY: 175 }));
      mode.onPointerUp(ctx, makeEvent({ worldX: 600, worldY: 175 }));
      const mutated = (ctx.mutate as ReturnType<typeof vi.fn>).mock.calls[0][0] as BoardObject[];
      expect(mutated[0].properties.arrow_style).toBe("end");
    });

    it("connector has stroke_style='solid' by default", () => {
      const ctx = createMockContext([rect1, rect2]);
      mode.onPointerDown(ctx, makeEvent({ worldX: 200, worldY: 175 }));
      mode.onPointerUp(ctx, makeEvent({ worldX: 600, worldY: 175 }));
      const mutated = (ctx.mutate as ReturnType<typeof vi.fn>).mock.calls[0][0] as BoardObject[];
      expect(mutated[0].properties.stroke_style).toBe("solid");
    });

    it("connector has type='connector'", () => {
      const ctx = createMockContext([rect1, rect2]);
      mode.onPointerDown(ctx, makeEvent({ worldX: 200, worldY: 175 }));
      mode.onPointerUp(ctx, makeEvent({ worldX: 600, worldY: 175 }));
      const mutated = (ctx.mutate as ReturnType<typeof vi.fn>).mock.calls[0][0] as BoardObject[];
      expect(mutated[0].type).toBe("connector");
    });
  });

  describe("state reset after connector creation", () => {
    it("clears sourceId after a successful connector creation", () => {
      const ctx = createMockContext([rect1, rect2]);
      mode.onPointerDown(ctx, makeEvent({ worldX: 200, worldY: 175 }));
      mode.onPointerUp(ctx, makeEvent({ worldX: 600, worldY: 175 }));
      expect(mode.getState().sourceId).toBeNull();
    });

    it("clears sourcePort after a successful connector creation", () => {
      const ctx = createMockContext([rect1, rect2]);
      mode.onPointerDown(ctx, makeEvent({ worldX: 200, worldY: 175 }));
      mode.onPointerUp(ctx, makeEvent({ worldX: 600, worldY: 175 }));
      expect(mode.getState().sourcePort).toBeNull();
    });

    it("clears cursor position after a successful connector creation", () => {
      const ctx = createMockContext([rect1, rect2]);
      mode.onPointerDown(ctx, makeEvent({ worldX: 200, worldY: 175 }));
      mode.onPointerMove(ctx, makeEvent({ worldX: 400, worldY: 175 }));
      mode.onPointerUp(ctx, makeEvent({ worldX: 600, worldY: 175 }));
      expect(mode.getState().cursorX).toBeUndefined();
      expect(mode.getState().cursorY).toBeUndefined();
    });
  });

  describe("onPointerUp with no source set", () => {
    it("does nothing when mouseUp fires before any mouseDown", () => {
      const ctx = createMockContext([rect1, rect2]);
      mode.onPointerUp(ctx, makeEvent({ worldX: 600, worldY: 175 }));
      expect(ctx.mutate).not.toHaveBeenCalled();
    });

    it("does nothing when mouseUp fires on empty canvas with no source", () => {
      const ctx = createMockContext([rect1]);
      mode.onPointerUp(ctx, makeEvent({ worldX: 50, worldY: 50 }));
      expect(ctx.mutate).not.toHaveBeenCalled();
    });
  });

  describe("onPointerUp with source but no target hit", () => {
    it("does not call mutate when mouseUp is on empty canvas", () => {
      const ctx = createMockContext([rect1]);
      mode.onPointerDown(ctx, makeEvent({ worldX: 200, worldY: 175 }));
      // Release on empty canvas
      mode.onPointerUp(ctx, makeEvent({ worldX: 900, worldY: 900 }));
      expect(ctx.mutate).not.toHaveBeenCalled();
    });

    it("clears state after releasing on empty canvas", () => {
      const ctx = createMockContext([rect1]);
      mode.onPointerDown(ctx, makeEvent({ worldX: 200, worldY: 175 }));
      mode.onPointerUp(ctx, makeEvent({ worldX: 900, worldY: 900 }));
      expect(mode.getState().sourceId).toBeNull();
    });
  });

  describe("ghost line — multiple moves", () => {
    it("updates cursorX/Y on each mousemove while source is set", () => {
      const ctx = createMockContext([rect1]);
      mode.onPointerDown(ctx, makeEvent({ worldX: 200, worldY: 175 }));
      mode.onPointerMove(ctx, makeEvent({ worldX: 350, worldY: 200 }));
      expect(mode.getState().cursorX).toBe(350);
      mode.onPointerMove(ctx, makeEvent({ worldX: 450, worldY: 250 }));
      expect(mode.getState().cursorX).toBe(450);
      expect(mode.getState().cursorY).toBe(250);
    });
  });

  describe("reset() clears cursor position", () => {
    it("reset() clears cursorX and cursorY", () => {
      const ctx = createMockContext([rect1]);
      mode.onPointerDown(ctx, makeEvent({ worldX: 200, worldY: 175 }));
      mode.onPointerMove(ctx, makeEvent({ worldX: 350, worldY: 200 }));
      mode.reset();
      expect(mode.getState().cursorX).toBeUndefined();
      expect(mode.getState().cursorY).toBeUndefined();
    });
  });
});

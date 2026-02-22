import { describe, it, expect, vi, beforeEach } from "vitest";
import { stickyNoteRenderer } from "../sticky-note-renderer";
import type { StickyNoteObject } from "@collabboard/shared";

function makeCtx(): CanvasRenderingContext2D {
  return {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    font: "",
    textAlign: "",
    textBaseline: "",
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetY: 0,
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    arcTo: vi.fn(),
    ellipse: vi.fn(),
    setLineDash: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
  } as unknown as CanvasRenderingContext2D;
}

function makeStickyNote(overrides: Partial<StickyNoteObject> = {}): StickyNoteObject {
  return {
    id: "sn-1",
    board_id: "board-1",
    type: "sticky_note",
    x: 100,
    y: 100,
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
    ...overrides,
  };
}

describe("stickyNoteRenderer", () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = makeCtx();
  });

  describe("draw()", () => {
    it("draws a filled rounded rectangle with the object color", () => {
      const obj = makeStickyNote();
      stickyNoteRenderer.draw(ctx, obj, false);
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it("draws selection border when selected", () => {
      const obj = makeStickyNote();
      stickyNoteRenderer.draw(ctx, obj, true);
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it("renders text content", () => {
      const obj = makeStickyNote({ content: "Test note" });
      stickyNoteRenderer.draw(ctx, obj, false);
      expect(ctx.fillText).toHaveBeenCalled();
    });

    it("applies strokeColor and strokeWidth when set", () => {
      const obj = makeStickyNote({ strokeColor: "#0000FF", strokeWidth: 2 });
      stickyNoteRenderer.draw(ctx, obj, false);
      expect(ctx.stroke).toHaveBeenCalled();
      expect(ctx.strokeStyle).toBe("#0000FF");
      expect(ctx.lineWidth).toBe(2);
    });

    it("does not stroke when strokeColor is not set and not selected", () => {
      const obj = makeStickyNote();
      stickyNoteRenderer.draw(ctx, obj, false);
      expect(ctx.stroke).not.toHaveBeenCalled();
    });
  });

  describe("hitTest()", () => {
    it("returns true for point inside bounds", () => {
      const obj = makeStickyNote({ x: 100, y: 100, width: 200, height: 200 });
      expect(stickyNoteRenderer.hitTest(obj, 200, 200)).toBe(true);
    });

    it("returns false for point outside bounds", () => {
      const obj = makeStickyNote({ x: 100, y: 100, width: 200, height: 200 });
      expect(stickyNoteRenderer.hitTest(obj, 50, 50)).toBe(false);
    });

    it("returns true for point on the edge", () => {
      const obj = makeStickyNote({ x: 100, y: 100, width: 200, height: 200 });
      expect(stickyNoteRenderer.hitTest(obj, 100, 100)).toBe(true);
      expect(stickyNoteRenderer.hitTest(obj, 300, 300)).toBe(true);
    });
  });

  describe("getBounds()", () => {
    it("returns correct bounding box", () => {
      const obj = makeStickyNote({ x: 50, y: 75, width: 200, height: 150 });
      expect(stickyNoteRenderer.getBounds(obj)).toEqual({
        x: 50,
        y: 75,
        width: 200,
        height: 150,
      });
    });
  });

  describe("getResizeHandles()", () => {
    it("returns 8 handles", () => {
      const obj = makeStickyNote({ x: 0, y: 0, width: 200, height: 200 });
      const handles = stickyNoteRenderer.getResizeHandles(obj);
      expect(handles).toHaveLength(8);
    });

    it("returns handles at correct positions", () => {
      const obj = makeStickyNote({ x: 0, y: 0, width: 200, height: 200 });
      const handles = stickyNoteRenderer.getResizeHandles(obj);
      const nw = handles.find((h) => h.id === "nw");
      const se = handles.find((h) => h.id === "se");
      expect(nw).toEqual({ id: "nw", x: 0, y: 0, cursor: "nwse-resize" });
      expect(se).toEqual({ id: "se", x: 200, y: 200, cursor: "nwse-resize" });
    });

    it("each handle has a cursor string", () => {
      const obj = makeStickyNote();
      const handles = stickyNoteRenderer.getResizeHandles(obj);
      for (const h of handles) {
        expect(h.cursor).toBeTruthy();
        expect(h.cursor).toContain("resize");
      }
    });
  });
});

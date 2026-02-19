import { describe, it, expect, vi, beforeEach } from "vitest";
import { frameRenderer } from "../frame-renderer";
import type { FrameObject } from "@collabboard/shared";

function makeCtx(): CanvasRenderingContext2D {
  return {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    font: "",
    textAlign: "",
    textBaseline: "",
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
    setLineDash: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
  } as unknown as CanvasRenderingContext2D;
}

function makeFrame(overrides: Partial<FrameObject> = {}): FrameObject {
  return {
    id: "frame-1",
    board_id: "board-1",
    type: "frame",
    x: 50,
    y: 50,
    width: 400,
    height: 300,
    rotation: 0,
    content: "My Frame",
    color: "#E0E0E0",
    version: 1,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    parent_frame_id: null,
    properties: {},
    ...overrides,
  };
}

describe("frameRenderer", () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = makeCtx();
  });

  describe("draw()", () => {
    it("draws a dashed border rectangle", () => {
      const obj = makeFrame();
      frameRenderer.draw(ctx, obj, false);
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.setLineDash).toHaveBeenCalledWith([6, 4]);
      expect(ctx.strokeRect).toHaveBeenCalledWith(50, 50, 400, 300);
      expect(ctx.restore).toHaveBeenCalled();
    });

    it("fills with a semi-transparent background", () => {
      const obj = makeFrame();
      frameRenderer.draw(ctx, obj, false);
      expect(ctx.fillRect).toHaveBeenCalledWith(50, 50, 400, 300);
    });

    it("draws the title text from content field", () => {
      const obj = makeFrame({ content: "Sprint Board" });
      frameRenderer.draw(ctx, obj, false);
      expect(ctx.fillText).toHaveBeenCalledWith(
        "Sprint Board",
        expect.any(Number),
        expect.any(Number)
      );
    });

    it("draws selection highlight when selected", () => {
      const obj = makeFrame();
      frameRenderer.draw(ctx, obj, true);
      // Should draw an additional selection border (blue)
      expect(ctx.strokeRect).toHaveBeenCalled();
    });

    it("draws even with empty content", () => {
      const obj = makeFrame({ content: "" });
      frameRenderer.draw(ctx, obj, false);
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });
  });

  describe("hitTest()", () => {
    it("returns true for point inside frame bounds", () => {
      const obj = makeFrame({ x: 50, y: 50, width: 400, height: 300 });
      expect(frameRenderer.hitTest(obj, 200, 200)).toBe(true);
    });

    it("returns false for point outside frame bounds", () => {
      const obj = makeFrame({ x: 50, y: 50, width: 400, height: 300 });
      expect(frameRenderer.hitTest(obj, 10, 10)).toBe(false);
    });

    it("returns true for point on the border", () => {
      const obj = makeFrame({ x: 50, y: 50, width: 400, height: 300 });
      expect(frameRenderer.hitTest(obj, 50, 50)).toBe(true);
    });

    it("returns true for point at bottom-right corner", () => {
      const obj = makeFrame({ x: 50, y: 50, width: 400, height: 300 });
      expect(frameRenderer.hitTest(obj, 450, 350)).toBe(true);
    });
  });

  describe("getBounds()", () => {
    it("returns correct bounding box", () => {
      const obj = makeFrame({ x: 10, y: 20, width: 500, height: 400 });
      expect(frameRenderer.getBounds(obj)).toEqual({
        x: 10,
        y: 20,
        width: 500,
        height: 400,
      });
    });
  });

  describe("getResizeHandles()", () => {
    it("returns 8 handles", () => {
      const obj = makeFrame();
      expect(frameRenderer.getResizeHandles(obj)).toHaveLength(8);
    });

    it("includes corner and edge handles", () => {
      const obj = makeFrame();
      const handles = frameRenderer.getResizeHandles(obj);
      const ids = handles.map((h) => h.id);
      expect(ids).toContain("nw");
      expect(ids).toContain("ne");
      expect(ids).toContain("sw");
      expect(ids).toContain("se");
      expect(ids).toContain("n");
      expect(ids).toContain("s");
      expect(ids).toContain("e");
      expect(ids).toContain("w");
    });
  });
});

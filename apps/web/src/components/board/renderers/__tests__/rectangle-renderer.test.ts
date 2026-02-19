import { describe, it, expect, vi, beforeEach } from "vitest";
import { rectangleRenderer } from "../rectangle-renderer";
import type { RectangleObject } from "@collabboard/shared";

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

function makeRectangle(overrides: Partial<RectangleObject> = {}): RectangleObject {
  return {
    id: "rect-1",
    board_id: "board-1",
    type: "rectangle",
    x: 100,
    y: 100,
    width: 200,
    height: 150,
    rotation: 0,
    content: "",
    color: "#42A5F5",
    version: 1,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    parent_frame_id: null,
    properties: {},
    ...overrides,
  };
}

describe("rectangleRenderer", () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = makeCtx();
  });

  describe("draw()", () => {
    it("draws a filled rectangle", () => {
      const obj = makeRectangle();
      rectangleRenderer.draw(ctx, obj, false);
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.fillRect).toHaveBeenCalledWith(100, 100, 200, 150);
      expect(ctx.restore).toHaveBeenCalled();
    });

    it("draws selection border when selected", () => {
      const obj = makeRectangle();
      rectangleRenderer.draw(ctx, obj, true);
      expect(ctx.strokeRect).toHaveBeenCalledWith(100, 100, 200, 150);
    });
  });

  describe("hitTest()", () => {
    it("returns true for point inside bounds", () => {
      const obj = makeRectangle({ x: 100, y: 100, width: 200, height: 150 });
      expect(rectangleRenderer.hitTest(obj, 200, 175)).toBe(true);
    });

    it("returns false for point outside bounds", () => {
      const obj = makeRectangle({ x: 100, y: 100, width: 200, height: 150 });
      expect(rectangleRenderer.hitTest(obj, 50, 50)).toBe(false);
    });
  });

  describe("getBounds()", () => {
    it("returns correct bounding box", () => {
      const obj = makeRectangle({ x: 10, y: 20, width: 300, height: 200 });
      expect(rectangleRenderer.getBounds(obj)).toEqual({
        x: 10,
        y: 20,
        width: 300,
        height: 200,
      });
    });
  });

  describe("getResizeHandles()", () => {
    it("returns 8 handles", () => {
      const obj = makeRectangle();
      expect(rectangleRenderer.getResizeHandles(obj)).toHaveLength(8);
    });
  });
});

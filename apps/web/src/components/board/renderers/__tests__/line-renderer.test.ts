import { describe, it, expect, vi, beforeEach } from "vitest";
import { lineRenderer } from "../line-renderer";
import type { LineObject } from "@collabboard/shared";

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
    rotate: vi.fn(),
    arcTo: vi.fn(),
    setLineDash: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
  } as unknown as CanvasRenderingContext2D;
}

function makeLine(overrides: Partial<LineObject> = {}): LineObject {
  return {
    id: "line-1",
    board_id: "board-1",
    type: "line",
    x: 100,
    y: 100,
    width: 0,
    height: 0,
    rotation: 0,
    content: "",
    color: "#333333",
    version: 1,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    parent_frame_id: null,
    properties: {
      x2: 300,
      y2: 200,
      arrow_style: "none",
      stroke_style: "solid",
      stroke_width: 2,
    },
    ...overrides,
  };
}

describe("lineRenderer", () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = makeCtx();
  });

  describe("draw()", () => {
    it("draws a line from (x,y) to (x2,y2)", () => {
      const obj = makeLine();
      lineRenderer.draw(ctx, obj, false);

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.moveTo).toHaveBeenCalledWith(100, 100);
      expect(ctx.lineTo).toHaveBeenCalledWith(300, 200);
      expect(ctx.stroke).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it("sets solid line dash for solid stroke_style", () => {
      const obj = makeLine();
      lineRenderer.draw(ctx, obj, false);
      expect(ctx.setLineDash).toHaveBeenCalledWith([]);
    });

    it("sets dashed pattern for dashed stroke_style", () => {
      const obj = makeLine({
        properties: {
          x2: 300,
          y2: 200,
          arrow_style: "none",
          stroke_style: "dashed",
          stroke_width: 2,
        },
      });
      lineRenderer.draw(ctx, obj, false);
      expect(ctx.setLineDash).toHaveBeenCalledWith([10, 5]);
    });

    it("sets dotted pattern for dotted stroke_style", () => {
      const obj = makeLine({
        properties: {
          x2: 300,
          y2: 200,
          arrow_style: "none",
          stroke_style: "dotted",
          stroke_width: 2,
        },
      });
      lineRenderer.draw(ctx, obj, false);
      expect(ctx.setLineDash).toHaveBeenCalledWith([2, 4]);
    });

    it("draws arrowhead at end when arrow_style is 'end'", () => {
      const obj = makeLine({
        properties: {
          x2: 300,
          y2: 200,
          arrow_style: "end",
          stroke_style: "solid",
          stroke_width: 2,
        },
      });
      lineRenderer.draw(ctx, obj, false);
      // Arrowhead requires fill call for the triangle
      expect(ctx.fill).toHaveBeenCalled();
    });

    it("draws arrowheads at both ends when arrow_style is 'both'", () => {
      const obj = makeLine({
        properties: {
          x2: 300,
          y2: 200,
          arrow_style: "both",
          stroke_style: "solid",
          stroke_width: 2,
        },
      });
      lineRenderer.draw(ctx, obj, false);
      // Two arrowheads = two fill calls
      const fillCalls = (ctx.fill as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(fillCalls).toBe(2);
    });

    it("draws selection highlight when selected", () => {
      const obj = makeLine();
      lineRenderer.draw(ctx, obj, true);
      // Should draw a wider stroke behind the main line for selection
      const strokeCalls = (ctx.stroke as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(strokeCalls).toBeGreaterThanOrEqual(2);
    });
  });

  describe("hitTest()", () => {
    it("returns true for a point near the line segment", () => {
      const obj = makeLine({
        x: 0,
        y: 0,
        properties: { x2: 100, y2: 0, arrow_style: "none", stroke_style: "solid", stroke_width: 2 },
      });
      // Point directly on the horizontal line
      expect(lineRenderer.hitTest(obj, 50, 0)).toBe(true);
    });

    it("returns true for a point within tolerance of the segment", () => {
      const obj = makeLine({
        x: 0,
        y: 0,
        properties: { x2: 100, y2: 0, arrow_style: "none", stroke_style: "solid", stroke_width: 2 },
      });
      // Point 3px above the horizontal line (within tolerance)
      expect(lineRenderer.hitTest(obj, 50, 3)).toBe(true);
    });

    it("returns false for a point far from the segment", () => {
      const obj = makeLine({
        x: 0,
        y: 0,
        properties: { x2: 100, y2: 0, arrow_style: "none", stroke_style: "solid", stroke_width: 2 },
      });
      // Point 20px above the horizontal line
      expect(lineRenderer.hitTest(obj, 50, 20)).toBe(false);
    });

    it("returns false for a point beyond segment endpoints", () => {
      const obj = makeLine({
        x: 0,
        y: 0,
        properties: { x2: 100, y2: 0, arrow_style: "none", stroke_style: "solid", stroke_width: 2 },
      });
      // Point past the end of the segment
      expect(lineRenderer.hitTest(obj, 120, 0)).toBe(false);
    });
  });

  describe("getBounds()", () => {
    it("returns bounding box enclosing both endpoints", () => {
      const obj = makeLine({
        x: 50,
        y: 100,
        properties: {
          x2: 250,
          y2: 50,
          arrow_style: "none",
          stroke_style: "solid",
          stroke_width: 2,
        },
      });
      const bounds = lineRenderer.getBounds(obj);
      expect(bounds.x).toBe(50);
      expect(bounds.y).toBe(50);
      expect(bounds.width).toBe(200);
      expect(bounds.height).toBe(50);
    });

    it("handles reversed coordinates (x2 < x)", () => {
      const obj = makeLine({
        x: 200,
        y: 200,
        properties: {
          x2: 50,
          y2: 100,
          arrow_style: "none",
          stroke_style: "solid",
          stroke_width: 2,
        },
      });
      const bounds = lineRenderer.getBounds(obj);
      expect(bounds.x).toBe(50);
      expect(bounds.y).toBe(100);
      expect(bounds.width).toBe(150);
      expect(bounds.height).toBe(100);
    });
  });

  describe("getResizeHandles()", () => {
    it("returns 2 handles (start and end)", () => {
      const obj = makeLine();
      const handles = lineRenderer.getResizeHandles(obj);
      expect(handles).toHaveLength(2);
    });

    it("places handles at start and end points", () => {
      const obj = makeLine({
        x: 100,
        y: 100,
        properties: {
          x2: 300,
          y2: 200,
          arrow_style: "none",
          stroke_style: "solid",
          stroke_width: 2,
        },
      });
      const handles = lineRenderer.getResizeHandles(obj);

      const start = handles.find((h) => h.id === "start");
      const end = handles.find((h) => h.id === "end");

      expect(start).toEqual({ id: "start", x: 100, y: 100, cursor: "move" });
      expect(end).toEqual({ id: "end", x: 300, y: 200, cursor: "move" });
    });
  });
});

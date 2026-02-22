import { describe, it, expect, vi, beforeEach } from "vitest";
import { triangleRenderer } from "../triangle-renderer";
import type { TriangleObject } from "@collabboard/shared";

function makeCtx(): CanvasRenderingContext2D {
  return {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
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
    ellipse: vi.fn(),
    setLineDash: vi.fn(),
    arc: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

function makeTriangle(overrides: Partial<TriangleObject> = {}): TriangleObject {
  return {
    id: "tri-1",
    board_id: "board-1",
    type: "triangle",
    x: 100,
    y: 100,
    width: 200,
    height: 173,
    rotation: 0,
    content: "",
    color: "#FF7043",
    version: 1,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    parent_frame_id: null,
    properties: {},
    ...overrides,
  };
}

describe("triangleRenderer", () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = makeCtx();
  });

  describe("draw()", () => {
    it("draws a triangle path", () => {
      const obj = makeTriangle();
      triangleRenderer.draw(ctx, obj, false);
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.moveTo).toHaveBeenCalled();
      expect(ctx.lineTo).toHaveBeenCalledTimes(2);
      expect(ctx.closePath).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });

    it("draws selection border when selected", () => {
      const obj = makeTriangle();
      triangleRenderer.draw(ctx, obj, true);
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it("does not draw selection border when not selected", () => {
      const obj = makeTriangle();
      triangleRenderer.draw(ctx, obj, false);
      expect(ctx.stroke).not.toHaveBeenCalled();
    });
  });

  describe("hitTest()", () => {
    it("returns true for point inside triangle", () => {
      const obj = makeTriangle({ x: 100, y: 100, width: 200, height: 173 });
      // Center-ish of triangle
      expect(triangleRenderer.hitTest(obj, 200, 230)).toBe(true);
    });

    it("returns false for point in bounding box corner (outside triangle)", () => {
      const obj = makeTriangle({ x: 100, y: 100, width: 200, height: 173 });
      // Top-left corner of bounding box is outside the triangle
      expect(triangleRenderer.hitTest(obj, 101, 101)).toBe(false);
    });

    it("returns false for point outside bounds", () => {
      const obj = makeTriangle({ x: 100, y: 100, width: 200, height: 173 });
      expect(triangleRenderer.hitTest(obj, 50, 50)).toBe(false);
    });
  });

  describe("getBounds()", () => {
    it("returns correct bounding box", () => {
      const obj = makeTriangle({ x: 50, y: 75, width: 200, height: 173 });
      expect(triangleRenderer.getBounds(obj)).toEqual({
        x: 50,
        y: 75,
        width: 200,
        height: 173,
      });
    });
  });

  describe("getResizeHandles()", () => {
    it("returns 8 handles", () => {
      const obj = makeTriangle();
      expect(triangleRenderer.getResizeHandles(obj)).toHaveLength(8);
    });

    it("corner handles are at bounding box corners", () => {
      const obj = makeTriangle({ x: 0, y: 0, width: 100, height: 100 });
      const handles = triangleRenderer.getResizeHandles(obj);
      const nw = handles.find((h) => h.id === "nw");
      expect(nw).toEqual({ id: "nw", x: 0, y: 0, cursor: "nwse-resize" });
    });
  });
});

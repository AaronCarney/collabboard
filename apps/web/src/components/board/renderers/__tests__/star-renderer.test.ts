import { describe, it, expect, vi, beforeEach } from "vitest";
import { starRenderer } from "../star-renderer";
import type { StarObject } from "@collabboard/shared";

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

function makeStar(overrides: Partial<StarObject> = {}): StarObject {
  return {
    id: "star-1",
    board_id: "board-1",
    type: "star",
    x: 100,
    y: 100,
    width: 200,
    height: 200,
    rotation: 0,
    content: "",
    color: "#AB47BC",
    version: 1,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    parent_frame_id: null,
    properties: {},
    ...overrides,
  };
}

describe("starRenderer", () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = makeCtx();
  });

  describe("draw()", () => {
    it("draws a star path with 10 vertices", () => {
      const obj = makeStar();
      starRenderer.draw(ctx, obj, false);
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.moveTo).toHaveBeenCalled();
      // 9 lineTo calls (first vertex is moveTo, remaining 9 are lineTo)
      expect(ctx.lineTo).toHaveBeenCalledTimes(9);
      expect(ctx.closePath).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });

    it("draws selection border when selected", () => {
      const obj = makeStar();
      starRenderer.draw(ctx, obj, true);
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it("does not draw selection border when not selected", () => {
      const obj = makeStar();
      starRenderer.draw(ctx, obj, false);
      expect(ctx.stroke).not.toHaveBeenCalled();
    });
  });

  describe("hitTest()", () => {
    it("returns true for point at center of star", () => {
      const obj = makeStar({ x: 100, y: 100, width: 200, height: 200 });
      // Center is at (200, 200)
      expect(starRenderer.hitTest(obj, 200, 200)).toBe(true);
    });

    it("returns false for point outside bounds", () => {
      const obj = makeStar({ x: 100, y: 100, width: 200, height: 200 });
      expect(starRenderer.hitTest(obj, 50, 50)).toBe(false);
    });

    it("returns false for point in bounding box corner (outside star)", () => {
      const obj = makeStar({ x: 100, y: 100, width: 200, height: 200 });
      // Top-left corner of bounding box is outside star
      expect(starRenderer.hitTest(obj, 101, 101)).toBe(false);
    });
  });

  describe("getBounds()", () => {
    it("returns correct bounding box", () => {
      const obj = makeStar({ x: 50, y: 75, width: 200, height: 200 });
      expect(starRenderer.getBounds(obj)).toEqual({
        x: 50,
        y: 75,
        width: 200,
        height: 200,
      });
    });
  });

  describe("getResizeHandles()", () => {
    it("returns 8 handles", () => {
      const obj = makeStar();
      expect(starRenderer.getResizeHandles(obj)).toHaveLength(8);
    });

    it("corner handles are at bounding box corners", () => {
      const obj = makeStar({ x: 0, y: 0, width: 100, height: 100 });
      const handles = starRenderer.getResizeHandles(obj);
      const se = handles.find((h) => h.id === "se");
      expect(se).toEqual({ id: "se", x: 100, y: 100, cursor: "nwse-resize" });
    });
  });
});

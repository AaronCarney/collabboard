import { describe, it, expect, vi, beforeEach } from "vitest";
import { circleRenderer } from "../circle-renderer";
import type { CircleObject } from "@collabboard/shared";

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

function makeCircle(overrides: Partial<CircleObject> = {}): CircleObject {
  return {
    id: "circle-1",
    board_id: "board-1",
    type: "circle",
    x: 100,
    y: 100,
    width: 150,
    height: 150,
    rotation: 0,
    content: "",
    color: "#66BB6A",
    version: 1,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    parent_frame_id: null,
    properties: {},
    ...overrides,
  };
}

describe("circleRenderer", () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = makeCtx();
  });

  describe("draw()", () => {
    it("draws an ellipse", () => {
      const obj = makeCircle();
      circleRenderer.draw(ctx, obj, false);
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.ellipse).toHaveBeenCalledWith(
        175, // x + width/2
        175, // y + height/2
        75, // width/2
        75, // height/2
        0,
        0,
        Math.PI * 2
      );
      expect(ctx.fill).toHaveBeenCalled();
    });

    it("draws selection border when selected", () => {
      const obj = makeCircle();
      circleRenderer.draw(ctx, obj, true);
      expect(ctx.stroke).toHaveBeenCalled();
    });
  });

  describe("hitTest()", () => {
    it("returns true for point inside ellipse", () => {
      const obj = makeCircle({ x: 100, y: 100, width: 150, height: 150 });
      // Center is at (175, 175)
      expect(circleRenderer.hitTest(obj, 175, 175)).toBe(true);
    });

    it("returns false for point in bounding box corner (outside ellipse)", () => {
      const obj = makeCircle({ x: 100, y: 100, width: 150, height: 150 });
      // Corner of bounding box - outside ellipse
      expect(circleRenderer.hitTest(obj, 100, 100)).toBe(false);
    });

    it("returns false for point outside bounds", () => {
      const obj = makeCircle({ x: 100, y: 100, width: 150, height: 150 });
      expect(circleRenderer.hitTest(obj, 50, 50)).toBe(false);
    });
  });

  describe("getBounds()", () => {
    it("returns correct bounding box", () => {
      const obj = makeCircle({ x: 50, y: 75, width: 150, height: 100 });
      expect(circleRenderer.getBounds(obj)).toEqual({
        x: 50,
        y: 75,
        width: 150,
        height: 100,
      });
    });
  });

  describe("getResizeHandles()", () => {
    it("returns 8 handles", () => {
      const obj = makeCircle();
      expect(circleRenderer.getResizeHandles(obj)).toHaveLength(8);
    });

    it("corner handles are at bounding box corners", () => {
      const obj = makeCircle({ x: 0, y: 0, width: 100, height: 100 });
      const handles = circleRenderer.getResizeHandles(obj);
      const nw = handles.find((h) => h.id === "nw");
      expect(nw).toEqual({ id: "nw", x: 0, y: 0, cursor: "nwse-resize" });
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { textRenderer } from "../text-renderer";
import type { TextObject } from "@collabboard/shared";

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
    stroke: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    setLineDash: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
  } as unknown as CanvasRenderingContext2D;
}

function makeText(overrides: Partial<TextObject> = {}): TextObject {
  return {
    id: "text-1",
    board_id: "board-1",
    type: "text",
    x: 100,
    y: 100,
    width: 200,
    height: 40,
    rotation: 0,
    content: "Hello World",
    color: "transparent",
    version: 1,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    parent_frame_id: null,
    properties: {},
    ...overrides,
  };
}

describe("textRenderer", () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = makeCtx();
  });

  describe("draw()", () => {
    it("draws text content", () => {
      const obj = makeText({ content: "Test text" });
      textRenderer.draw(ctx, obj, false);
      expect(ctx.fillText).toHaveBeenCalled();
    });

    it("draws selection border when selected", () => {
      const obj = makeText();
      textRenderer.draw(ctx, obj, true);
      expect(ctx.setLineDash).toHaveBeenCalled();
      expect(ctx.strokeRect).toHaveBeenCalled();
    });

    it("draws placeholder when content is empty", () => {
      const obj = makeText({ content: "" });
      textRenderer.draw(ctx, obj, false);
      expect(ctx.fillText).toHaveBeenCalled();
    });
  });

  describe("hitTest()", () => {
    it("returns true for point inside bounds", () => {
      const obj = makeText({ x: 100, y: 100, width: 200, height: 40 });
      expect(textRenderer.hitTest(obj, 200, 120)).toBe(true);
    });

    it("returns false for point outside bounds", () => {
      const obj = makeText({ x: 100, y: 100, width: 200, height: 40 });
      expect(textRenderer.hitTest(obj, 50, 50)).toBe(false);
    });
  });

  describe("getBounds()", () => {
    it("returns correct bounding box", () => {
      const obj = makeText({ x: 50, y: 75, width: 200, height: 40 });
      expect(textRenderer.getBounds(obj)).toEqual({
        x: 50,
        y: 75,
        width: 200,
        height: 40,
      });
    });
  });

  describe("getResizeHandles()", () => {
    it("returns 8 handles", () => {
      const obj = makeText();
      expect(textRenderer.getResizeHandles(obj)).toHaveLength(8);
    });
  });
});

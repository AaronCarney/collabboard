import type { BoardObject } from "@collabboard/shared";
import type { ShapeRenderer } from "./types";
import { getStandardResizeHandles, aabbGetBounds } from "./render-utils";

export const circleRenderer: ShapeRenderer = {
  draw(ctx: CanvasRenderingContext2D, obj: BoardObject, isSelected: boolean): void {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(
      obj.x + obj.width / 2,
      obj.y + obj.height / 2,
      obj.width / 2,
      obj.height / 2,
      0,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = obj.color;
    ctx.fill();
    if (obj.strokeColor) {
      ctx.strokeStyle = obj.strokeColor;
      ctx.lineWidth = obj.strokeWidth ?? 1;
      ctx.stroke();
    }
    if (isSelected) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
  },

  hitTest(obj: BoardObject, wx: number, wy: number): boolean {
    const cx = obj.x + obj.width / 2;
    const cy = obj.y + obj.height / 2;
    const rx = obj.width / 2;
    const ry = obj.height / 2;
    if (rx === 0 || ry === 0) return false;
    return (wx - cx) ** 2 / rx ** 2 + (wy - cy) ** 2 / ry ** 2 <= 1;
  },

  getBounds(obj: BoardObject) {
    return aabbGetBounds(obj);
  },

  getResizeHandles(obj: BoardObject) {
    return getStandardResizeHandles(obj);
  },
};

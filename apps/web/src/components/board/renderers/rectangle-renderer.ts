import type { BoardObject } from "@collabboard/shared";
import type { ShapeRenderer } from "./types";
import { getStandardResizeHandles, aabbHitTest, aabbGetBounds } from "./render-utils";

export const rectangleRenderer: ShapeRenderer = {
  draw(ctx: CanvasRenderingContext2D, obj: BoardObject, isSelected: boolean): void {
    ctx.save();
    ctx.fillStyle = obj.color;
    ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
    if (isSelected) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 3;
      ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
    }
    ctx.restore();
  },

  hitTest(obj: BoardObject, wx: number, wy: number): boolean {
    return aabbHitTest(obj, wx, wy);
  },

  getBounds(obj: BoardObject) {
    return aabbGetBounds(obj);
  },

  getResizeHandles(obj: BoardObject) {
    return getStandardResizeHandles(obj);
  },
};

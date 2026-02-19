import type { BoardObject } from "@collabboard/shared";
import { PLACEHOLDER_CONTENT } from "@collabboard/shared";
import type { ShapeRenderer } from "./types";
import { getStandardResizeHandles, aabbHitTest, aabbGetBounds } from "./render-utils";

export const textRenderer: ShapeRenderer = {
  draw(ctx: CanvasRenderingContext2D, obj: BoardObject, isSelected: boolean): void {
    ctx.save();

    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- intentional: empty string should fall through to placeholder
    const displayContent = obj.content || PLACEHOLDER_CONTENT[obj.type] || "Text";
    ctx.fillStyle = obj.content ? "#1a1a1a" : "#999999";
    ctx.font = "18px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(displayContent, obj.x, obj.y);

    if (isSelected) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(obj.x - 4, obj.y - 4, obj.width + 8, obj.height + 8);
      ctx.setLineDash([]);
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

import type { BoardObject } from "@collabboard/shared";
import { PLACEHOLDER_CONTENT } from "@collabboard/shared";
import type { ShapeRenderer } from "./types";
import {
  getStandardResizeHandles,
  aabbHitTest,
  aabbGetBounds,
  roundRectPath,
  wrapText,
} from "./render-utils";

export const stickyNoteRenderer: ShapeRenderer = {
  draw(ctx: CanvasRenderingContext2D, obj: BoardObject, isSelected: boolean): void {
    ctx.save();

    // Shadow
    ctx.shadowColor = "rgba(0,0,0,0.1)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = obj.color;
    roundRectPath(ctx, obj.x, obj.y, obj.width, obj.height, 8);
    ctx.fill();

    ctx.shadowColor = "transparent";

    if (obj.strokeColor) {
      ctx.strokeStyle = obj.strokeColor;
      ctx.lineWidth = obj.strokeWidth ?? 1;
      roundRectPath(ctx, obj.x, obj.y, obj.width, obj.height, 8);
      ctx.stroke();
    }

    if (isSelected) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 3;
      roundRectPath(ctx, obj.x, obj.y, obj.width, obj.height, 8);
      ctx.stroke();
    }

    // Text (or placeholder)
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- intentional: empty string should fall through to placeholder
    const displayContent = obj.content || PLACEHOLDER_CONTENT[obj.type] || "";
    if (displayContent) {
      ctx.fillStyle = obj.content ? "#1a1a1a" : "#999999";
      ctx.font = "14px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      wrapText(ctx, displayContent, obj.x + 12, obj.y + 12, obj.width - 24, 18);
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

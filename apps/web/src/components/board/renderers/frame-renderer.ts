import type { BoardObject } from "@collabboard/shared";
import type { ShapeRenderer } from "./types";
import { getStandardResizeHandles, aabbHitTest, aabbGetBounds } from "./render-utils";

const TITLE_BAR_HEIGHT = 28;
const TITLE_FONT = "bold 12px Inter, system-ui, sans-serif";
const TITLE_PADDING = 10;
const DASH_PATTERN: [number, number] = [6, 4];
const BG_ALPHA = 0.04;
const BORDER_COLOR = "#9E9E9E";
const SELECTION_COLOR = "#3b82f6";

export const frameRenderer: ShapeRenderer = {
  draw(ctx: CanvasRenderingContext2D, obj: BoardObject, isSelected: boolean): void {
    ctx.save();

    // Semi-transparent background
    ctx.fillStyle = `rgba(0, 0, 0, ${String(BG_ALPHA)})`;
    ctx.fillRect(obj.x, obj.y, obj.width, obj.height);

    // Dashed border
    ctx.setLineDash(DASH_PATTERN);
    ctx.strokeStyle = isSelected ? SELECTION_COLOR : BORDER_COLOR;
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
    ctx.setLineDash([]);

    // Title bar background
    ctx.fillStyle = isSelected ? "rgba(59, 130, 246, 0.08)" : "rgba(0, 0, 0, 0.06)";
    ctx.fillRect(obj.x, obj.y, obj.width, TITLE_BAR_HEIGHT);

    // Title text
    if (obj.content) {
      ctx.font = TITLE_FONT;
      ctx.fillStyle = "#424242";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(obj.content, obj.x + TITLE_PADDING, obj.y + TITLE_BAR_HEIGHT / 2);
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

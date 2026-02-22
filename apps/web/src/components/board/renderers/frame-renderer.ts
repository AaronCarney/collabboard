import type { BoardObject } from "@collabboard/shared";
import type { ShapeRenderer } from "./types";
import { getStandardResizeHandles, aabbHitTest, aabbGetBounds } from "./render-utils";

const TITLE_BAR_HEIGHT = 28;
const TITLE_FONT = "bold 12px Inter, system-ui, sans-serif";
const TITLE_PADDING = 10;
const DASH_PATTERN: [number, number] = [6, 4];
const BG_ALPHA = 0.04;
const SELECTION_COLOR = "#3b82f6";

/**
 * Convert a hex color string to an rgba() string with a given alpha.
 */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return `rgba(0, 0, 0, ${String(alpha)})`;
  }
  return `rgba(${String(r)}, ${String(g)}, ${String(b)}, ${String(alpha)})`;
}

export const frameRenderer: ShapeRenderer = {
  draw(ctx: CanvasRenderingContext2D, obj: BoardObject, isSelected: boolean): void {
    ctx.save();

    const frameColor = obj.color || "#9E9E9E";

    // Semi-transparent background using obj.color
    ctx.fillStyle = hexToRgba(frameColor, BG_ALPHA);
    ctx.fillRect(obj.x, obj.y, obj.width, obj.height);

    // Dashed border using obj.color (or selection color when selected)
    ctx.setLineDash(DASH_PATTERN);
    ctx.strokeStyle = isSelected ? SELECTION_COLOR : frameColor;
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
    ctx.setLineDash([]);

    // Title bar background
    ctx.fillStyle = isSelected ? "rgba(59, 130, 246, 0.08)" : hexToRgba(frameColor, 0.06);
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

import type { BoardObject, LineObject } from "@collabboard/shared";
import type { ShapeRenderer } from "./types";

const HIT_TOLERANCE = 8;
const ARROWHEAD_SIZE = 12;

function isLineObject(obj: BoardObject): obj is LineObject {
  return obj.type === "line";
}

function setStrokeDash(ctx: CanvasRenderingContext2D, style: string): void {
  if (style === "dashed") {
    ctx.setLineDash([10, 5]);
  } else if (style === "dotted") {
    ctx.setLineDash([2, 4]);
  } else {
    ctx.setLineDash([]);
  }
}

function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  tipX: number,
  tipY: number,
  fromX: number,
  fromY: number
): void {
  const angle = Math.atan2(tipY - fromY, tipX - fromX);
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(
    tipX - ARROWHEAD_SIZE * Math.cos(angle - Math.PI / 6),
    tipY - ARROWHEAD_SIZE * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    tipX - ARROWHEAD_SIZE * Math.cos(angle + Math.PI / 6),
    tipY - ARROWHEAD_SIZE * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}

/** Point-to-segment squared distance. */
function pointToSegmentDistSq(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    // Degenerate segment (point)
    const ddx = px - x1;
    const ddy = py - y1;
    return ddx * ddx + ddy * ddy;
  }

  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  const ddx = px - projX;
  const ddy = py - projY;
  return ddx * ddx + ddy * ddy;
}

export const lineRenderer: ShapeRenderer = {
  draw(ctx: CanvasRenderingContext2D, obj: BoardObject, isSelected: boolean): void {
    if (!isLineObject(obj)) return;

    const { x, y } = obj;
    const { x2, y2, arrow_style, stroke_style, stroke_width } = obj.properties;

    ctx.save();

    // Selection highlight — wider stroke behind main line
    if (isSelected) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = stroke_width + 4;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Main line
    ctx.strokeStyle = obj.color;
    ctx.lineWidth = stroke_width;
    setStrokeDash(ctx, stroke_style);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Arrowheads (drawn with solid lines)
    ctx.setLineDash([]);
    ctx.fillStyle = obj.color;

    if (arrow_style === "end" || arrow_style === "both") {
      drawArrowhead(ctx, x2, y2, x, y);
    }
    if (arrow_style === "both") {
      drawArrowhead(ctx, x, y, x2, y2);
    }

    ctx.restore();
  },

  hitTest(obj: BoardObject, wx: number, wy: number): boolean {
    if (!isLineObject(obj)) return false;

    const { x, y } = obj;
    const { x2, y2 } = obj.properties;
    const distSq = pointToSegmentDistSq(wx, wy, x, y, x2, y2);
    return distSq <= HIT_TOLERANCE * HIT_TOLERANCE;
  },

  getBounds(obj: BoardObject) {
    if (!isLineObject(obj)) return { x: obj.x, y: obj.y, width: obj.width, height: obj.height };

    const { x, y } = obj;
    const { x2, y2 } = obj.properties;
    const minX = Math.min(x, x2);
    const minY = Math.min(y, y2);
    const maxX = Math.max(x, x2);
    const maxY = Math.max(y, y2);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  },

  getResizeHandles(obj: BoardObject) {
    if (!isLineObject(obj)) return [];

    const { x, y } = obj;
    const { x2, y2 } = obj.properties;

    return [
      { id: "start", x, y, cursor: "move" },
      { id: "end", x: x2, y: y2, cursor: "move" },
    ];
  },
};

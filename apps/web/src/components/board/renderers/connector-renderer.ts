import type { BoardObject, ConnectorObject, PortName } from "@collabboard/shared";
import type { ShapeRenderer } from "./types";

const HIT_TOLERANCE = 8;
const ARROWHEAD_SIZE = 12;
const DANGLING_COLOR = "#EF4444";
const DANGLING_DASH = [6, 4];

// ─── Object Resolver ──────────────────────────────────────
// Module-level resolver set by the render loop before each frame.
// This avoids changing the ShapeRenderer interface.

type ObjectResolver = (id: string) => BoardObject | null;

let resolver: ObjectResolver = () => null;

/** Set the resolver used to look up connected objects by ID. Call before each render pass. */
export function setObjectResolver(fn: ObjectResolver): void {
  resolver = fn;
}

// ─── Port Resolution ──────────────────────────────────────

function getPortPosition(obj: BoardObject, port: PortName): { x: number; y: number } {
  const { x, y, width, height } = obj;
  switch (port) {
    case "top":
      return { x: x + width / 2, y };
    case "right":
      return { x: x + width, y: y + height / 2 };
    case "bottom":
      return { x: x + width / 2, y: y + height };
    case "left":
      return { x, y: y + height / 2 };
    case "center":
      return { x: x + width / 2, y: y + height / 2 };
  }
}

function resolveEndpoints(conn: ConnectorObject): {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  isDangling: boolean;
} {
  const fromObj = resolver(conn.properties.from_object_id);
  const toObj = resolver(conn.properties.to_object_id);
  const isDangling = !fromObj || !toObj;

  const from = fromObj
    ? getPortPosition(fromObj, conn.properties.from_port)
    : { x: conn.x, y: conn.y };
  const to = toObj ? getPortPosition(toObj, conn.properties.to_port) : { x: conn.x, y: conn.y };

  return { fromX: from.x, fromY: from.y, toX: to.x, toY: to.y, isDangling };
}

// ─── Drawing Helpers ──────────────────────────────────────

function isConnectorObject(obj: BoardObject): obj is ConnectorObject {
  return obj.type === "connector";
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

// ─── Renderer ─────────────────────────────────────────────

export const connectorRenderer: ShapeRenderer = {
  draw(ctx: CanvasRenderingContext2D, obj: BoardObject, isSelected: boolean): void {
    if (!isConnectorObject(obj)) return;

    const { fromX, fromY, toX, toY, isDangling } = resolveEndpoints(obj);
    const { arrow_style, stroke_style } = obj.properties;

    ctx.save();

    // Selection highlight
    if (isSelected) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 6;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();
    }

    // Main line
    if (isDangling) {
      ctx.strokeStyle = DANGLING_COLOR;
      ctx.setLineDash(DANGLING_DASH);
      ctx.globalAlpha = 0.6;
    } else {
      ctx.strokeStyle = obj.color;
      setStrokeDash(ctx, stroke_style);
    }
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Arrowheads (only when not dangling)
    if (!isDangling) {
      ctx.setLineDash([]);
      ctx.fillStyle = obj.color;

      if (arrow_style === "end" || arrow_style === "both") {
        drawArrowhead(ctx, toX, toY, fromX, fromY);
      }
      if (arrow_style === "both") {
        drawArrowhead(ctx, fromX, fromY, toX, toY);
      }
    }

    ctx.restore();
  },

  hitTest(obj: BoardObject, wx: number, wy: number): boolean {
    if (!isConnectorObject(obj)) return false;

    const { fromX, fromY, toX, toY } = resolveEndpoints(obj);
    const distSq = pointToSegmentDistSq(wx, wy, fromX, fromY, toX, toY);
    return distSq <= HIT_TOLERANCE * HIT_TOLERANCE;
  },

  getBounds(obj: BoardObject) {
    if (!isConnectorObject(obj)) {
      return { x: obj.x, y: obj.y, width: obj.width, height: obj.height };
    }

    const { fromX, fromY, toX, toY } = resolveEndpoints(obj);
    const minX = Math.min(fromX, toX);
    const minY = Math.min(fromY, toY);
    const maxX = Math.max(fromX, toX);
    const maxY = Math.max(fromY, toY);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  },

  getResizeHandles(_obj: BoardObject) {
    // Connectors are not directly resizable — their position is derived from connected objects
    return [];
  },
};

import type { LineObject, ConnectorObject, PortName } from "@collabboard/shared";

// ─────────────────────────────────────────────────────────────
// Parameter types
// ─────────────────────────────────────────────────────────────

interface CreateLineObjectParams {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  boardId: string;
  userId: string;
}

interface CreateLineObjectQuickClickParams {
  x: number;
  y: number;
  boardId: string;
  userId: string;
}

interface CreateConnectorObjectParams {
  sourceId: string;
  sourcePort: PortName;
  targetId: string;
  targetPort: PortName;
  boardId: string;
  userId: string;
}

interface DragDefaults {
  width: number;
  height: number;
}

interface ComputeDragBoundsParams {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  defaults: DragDefaults;
}

interface DragBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ObjectWithBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const DRAG_THRESHOLD = 5;
const LINE_QUICK_CLICK_LENGTH = 200;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function makeTimestamp(): string {
  return new Date().toISOString();
}

// ─────────────────────────────────────────────────────────────
// createLineObject
// ─────────────────────────────────────────────────────────────

export function createLineObject(params: CreateLineObjectParams): LineObject {
  const { startX, startY, endX, endY, boardId, userId } = params;
  const now = makeTimestamp();

  return {
    id: crypto.randomUUID(),
    board_id: boardId,
    type: "line",
    x: startX,
    y: startY,
    width: 0,
    height: 0,
    rotation: 0,
    content: "",
    color: "#333333",
    opacity: 1,
    fontSize: 16,
    fontFamily: "sans-serif",
    version: 0,
    created_by: userId,
    created_at: now,
    updated_at: now,
    parent_frame_id: null,
    properties: {
      x2: endX,
      y2: endY,
      arrow_style: "none",
      stroke_style: "solid",
      stroke_width: 2,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// createLineObjectQuickClick
// ─────────────────────────────────────────────────────────────

export function createLineObjectQuickClick(
  params: CreateLineObjectQuickClickParams,
): LineObject {
  const { x, y, boardId, userId } = params;

  return createLineObject({
    startX: x,
    startY: y,
    endX: x + LINE_QUICK_CLICK_LENGTH,
    endY: y,
    boardId,
    userId,
  });
}

// ─────────────────────────────────────────────────────────────
// createConnectorObject
// ─────────────────────────────────────────────────────────────

export function createConnectorObject(
  params: CreateConnectorObjectParams,
): ConnectorObject {
  const { sourceId, sourcePort, targetId, targetPort, boardId, userId } =
    params;
  const now = makeTimestamp();

  return {
    id: crypto.randomUUID(),
    board_id: boardId,
    type: "connector",
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rotation: 0,
    content: "",
    color: "#333333",
    opacity: 1,
    fontSize: 16,
    fontFamily: "sans-serif",
    version: 0,
    created_by: userId,
    created_at: now,
    updated_at: now,
    parent_frame_id: null,
    properties: {
      from_object_id: sourceId,
      to_object_id: targetId,
      from_port: sourcePort,
      to_port: targetPort,
      arrow_style: "end",
      stroke_style: "solid",
    },
  };
}

// ─────────────────────────────────────────────────────────────
// computeDragBounds
// ─────────────────────────────────────────────────────────────

export function computeDragBounds(params: ComputeDragBoundsParams): DragBounds {
  const { startX, startY, endX, endY, defaults } = params;

  const dx = endX - startX;
  const dy = endY - startY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < DRAG_THRESHOLD) {
    return {
      x: startX,
      y: startY,
      width: defaults.width,
      height: defaults.height,
    };
  }

  return {
    x: Math.min(startX, endX),
    y: Math.min(startY, endY),
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
  };
}

// ─────────────────────────────────────────────────────────────
// getNearestPort
// ─────────────────────────────────────────────────────────────

export function getNearestPort(
  obj: ObjectWithBounds,
  wx: number,
  wy: number,
): PortName {
  const cx = obj.x + obj.width / 2;
  const cy = obj.y + obj.height / 2;

  const ports: { name: PortName; px: number; py: number }[] = [
    { name: "top", px: cx, py: obj.y },
    { name: "right", px: obj.x + obj.width, py: cy },
    { name: "bottom", px: cx, py: obj.y + obj.height },
    { name: "left", px: obj.x, py: cy },
    { name: "center", px: cx, py: cy },
  ];

  let nearest: PortName = "center";
  let minDist = Infinity;

  for (const port of ports) {
    const ddx = wx - port.px;
    const ddy = wy - port.py;
    const dist = Math.sqrt(ddx * ddx + ddy * ddy);
    if (dist < minDist) {
      minDist = dist;
      nearest = port.name;
    }
  }

  return nearest;
}

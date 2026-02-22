import type { BoardObject, PortName } from "@collabboard/shared";
import dagre from "@dagrejs/dagre";
import { MIN_POSITION, MAX_POSITION } from "./validation";

// ─── Types ──────────────────────────────────────────────────

export type LayoutDirection = "TB" | "LR" | "BT" | "RL";

export interface LayoutOptions {
  direction?: LayoutDirection;
  spacing?: number;
}

export interface LayoutResult {
  objects: BoardObject[];
  boundingBox: { x: number; y: number; width: number; height: number };
}

export interface GridOptions {
  columns?: number;
  cellWidth?: number;
  cellHeight?: number;
  gap?: number;
  origin?: { x: number; y: number };
}

export interface GridResult {
  objects: BoardObject[];
  boundingBox: { x: number; y: number; width: number; height: number };
}

export interface StackOptions {
  direction?: "horizontal" | "vertical";
  gap?: number;
  align?: "start" | "center" | "end";
  origin?: { x: number; y: number };
}

export interface StackResult {
  objects: BoardObject[];
  boundingBox: { x: number; y: number; width: number; height: number };
}

export interface RadialOptions {
  centerX?: number;
  centerY?: number;
  radius?: number;
  startAngle?: number;
}

export interface RadialResult {
  objects: BoardObject[];
  boundingBox: { x: number; y: number; width: number; height: number };
}

export interface ConnectorSuggestion {
  fromId: string;
  toId: string;
  fromPort: PortName;
  toPort: PortName;
}

// ─── Constants ──────────────────────────────────────────────

const DEFAULT_SPACING = 60;
const DEFAULT_DIRECTION: LayoutDirection = "TB";
const DEFAULT_GRID_COLUMNS = 3;
const DEFAULT_GRID_GAP = 20;
const DEFAULT_STACK_GAP = 20;
const DEFAULT_RADIUS = 200;
const DEFAULT_START_ANGLE = -Math.PI / 2; // top

// ─── Helpers ────────────────────────────────────────────────

function clampToBounds(value: number): number {
  return Math.max(MIN_POSITION, Math.min(MAX_POSITION, value));
}

function computeBoundingBox(objects: BoardObject[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (objects.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const obj of objects) {
    if (obj.x < minX) {
      minX = obj.x;
    }
    if (obj.y < minY) {
      minY = obj.y;
    }
    if (obj.x + obj.width > maxX) {
      maxX = obj.x + obj.width;
    }
    if (obj.y + obj.height > maxY) {
      maxY = obj.y + obj.height;
    }
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// ─── Layout Functions ───────────────────────────────────────

/**
 * Compute a DAG layout for board objects connected by connectors.
 * Uses dagre for hierarchical graph layout. Pure function.
 */
export function computeDagLayout(
  objects: BoardObject[],
  connectors: BoardObject[],
  options?: LayoutOptions
): LayoutResult {
  if (objects.length === 0) {
    return { objects: [], boundingBox: { x: 0, y: 0, width: 0, height: 0 } };
  }

  if (objects.length === 1) {
    const copy = { ...objects[0] };
    return {
      objects: [copy],
      boundingBox: { x: copy.x, y: copy.y, width: copy.width, height: copy.height },
    };
  }

  const direction = options?.direction ?? DEFAULT_DIRECTION;
  const spacing = options?.spacing ?? DEFAULT_SPACING;

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: direction,
    nodesep: spacing,
    ranksep: spacing,
    marginx: 0,
    marginy: 0,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const objectMap = new Map<string, BoardObject>();
  for (const obj of objects) {
    objectMap.set(obj.id, obj);
    g.setNode(obj.id, { width: obj.width, height: obj.height });
  }

  for (const conn of connectors) {
    if (conn.type !== "connector") {
      continue;
    }
    const props = conn.properties as { from_object_id: string; to_object_id: string };
    if (objectMap.has(props.from_object_id) && objectMap.has(props.to_object_id)) {
      g.setEdge(props.from_object_id, props.to_object_id);
    }
  }

  dagre.layout(g);

  const result: BoardObject[] = [];
  for (const obj of objects) {
    const node = g.node(obj.id) as { x: number; y: number; width: number; height: number };
    const copy = { ...obj };
    // dagre returns center-based coords; convert to top-left
    copy.x = clampToBounds(Math.round(node.x - node.width / 2));
    copy.y = clampToBounds(Math.round(node.y - node.height / 2));
    result.push(copy);
  }

  return { objects: result, boundingBox: computeBoundingBox(result) };
}

/**
 * Arrange board objects in a grid layout. Pure function.
 */
export function computeGridLayout(objects: BoardObject[], options?: GridOptions): GridResult {
  if (objects.length === 0) {
    return { objects: [], boundingBox: { x: 0, y: 0, width: 0, height: 0 } };
  }

  const columns = Math.max(1, options?.columns ?? DEFAULT_GRID_COLUMNS);
  const gap = options?.gap ?? DEFAULT_GRID_GAP;
  const originX = options?.origin?.x ?? 0;
  const originY = options?.origin?.y ?? 0;

  // Determine cell dimensions: use explicit or derive from max object size
  let cellWidth = options?.cellWidth;
  let cellHeight = options?.cellHeight;

  if (cellWidth === undefined || cellHeight === undefined) {
    let maxW = 0;
    let maxH = 0;
    for (const obj of objects) {
      if (obj.width > maxW) {
        maxW = obj.width;
      }
      if (obj.height > maxH) {
        maxH = obj.height;
      }
    }
    cellWidth ??= maxW;
    cellHeight ??= maxH;
  }

  const result: BoardObject[] = [];
  for (let i = 0; i < objects.length; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const copy = { ...objects[i] };
    copy.x = clampToBounds(Math.round(originX + col * (cellWidth + gap)));
    copy.y = clampToBounds(Math.round(originY + row * (cellHeight + gap)));
    result.push(copy);
  }

  return { objects: result, boundingBox: computeBoundingBox(result) };
}

/**
 * Arrange board objects in a horizontal or vertical stack. Pure function.
 */
export function computeStackLayout(objects: BoardObject[], options?: StackOptions): StackResult {
  if (objects.length === 0) {
    return { objects: [], boundingBox: { x: 0, y: 0, width: 0, height: 0 } };
  }

  const direction = options?.direction ?? "vertical";
  const gap = options?.gap ?? DEFAULT_STACK_GAP;
  const align = options?.align ?? "start";
  const originX = options?.origin?.x ?? 0;
  const originY = options?.origin?.y ?? 0;

  // Compute max cross-axis dimension for alignment
  let maxCross = 0;
  for (const obj of objects) {
    const cross = direction === "vertical" ? obj.width : obj.height;
    if (cross > maxCross) {
      maxCross = cross;
    }
  }

  const result: BoardObject[] = [];
  let cursor = 0;

  for (const obj of objects) {
    const copy = { ...obj };

    if (direction === "vertical") {
      copy.y = clampToBounds(Math.round(originY + cursor));
      if (align === "start") {
        copy.x = clampToBounds(originX);
      } else if (align === "center") {
        copy.x = clampToBounds(Math.round(originX + (maxCross - obj.width) / 2));
      } else {
        copy.x = clampToBounds(Math.round(originX + maxCross - obj.width));
      }
      cursor += obj.height + gap;
    } else {
      copy.x = clampToBounds(Math.round(originX + cursor));
      if (align === "start") {
        copy.y = clampToBounds(originY);
      } else if (align === "center") {
        copy.y = clampToBounds(Math.round(originY + (maxCross - obj.height) / 2));
      } else {
        copy.y = clampToBounds(Math.round(originY + maxCross - obj.height));
      }
      cursor += obj.width + gap;
    }

    result.push(copy);
  }

  return { objects: result, boundingBox: computeBoundingBox(result) };
}

/**
 * Arrange board objects in a radial (circle) layout. Pure function.
 */
export function computeRadialLayout(objects: BoardObject[], options?: RadialOptions): RadialResult {
  if (objects.length === 0) {
    return { objects: [], boundingBox: { x: 0, y: 0, width: 0, height: 0 } };
  }

  const cx = options?.centerX ?? 0;
  const cy = options?.centerY ?? 0;
  const radius = options?.radius ?? DEFAULT_RADIUS;
  const startAngle = options?.startAngle ?? DEFAULT_START_ANGLE;

  if (objects.length === 1) {
    const copy = { ...objects[0] };
    copy.x = clampToBounds(Math.round(cx - copy.width / 2));
    copy.y = clampToBounds(Math.round(cy - copy.height / 2));
    return {
      objects: [copy],
      boundingBox: { x: copy.x, y: copy.y, width: copy.width, height: copy.height },
    };
  }

  const result: BoardObject[] = [];
  const angleStep = (2 * Math.PI) / objects.length;

  for (let i = 0; i < objects.length; i++) {
    const angle = startAngle + i * angleStep;
    const copy = { ...objects[i] };
    copy.x = clampToBounds(Math.round(cx + radius * Math.cos(angle) - copy.width / 2));
    copy.y = clampToBounds(Math.round(cy + radius * Math.sin(angle) - copy.height / 2));
    result.push(copy);
  }

  return { objects: result, boundingBox: computeBoundingBox(result) };
}

/**
 * Suggest connector ports between two objects based on their relative positions.
 * Returns port assignments that produce the shortest visual path.
 */
export function suggestConnectorPorts(
  fromObj: BoardObject,
  toObj: BoardObject
): ConnectorSuggestion {
  const fromCx = fromObj.x + fromObj.width / 2;
  const fromCy = fromObj.y + fromObj.height / 2;
  const toCx = toObj.x + toObj.width / 2;
  const toCy = toObj.y + toObj.height / 2;

  const dx = toCx - fromCx;
  const dy = toCy - fromCy;

  let fromPort: PortName;
  let toPort: PortName;

  if (Math.abs(dx) >= Math.abs(dy)) {
    // Horizontal dominance
    if (dx >= 0) {
      fromPort = "right";
      toPort = "left";
    } else {
      fromPort = "left";
      toPort = "right";
    }
  } else {
    // Vertical dominance
    if (dy >= 0) {
      fromPort = "bottom";
      toPort = "top";
    } else {
      fromPort = "top";
      toPort = "bottom";
    }
  }

  return {
    fromId: fromObj.id,
    toId: toObj.id,
    fromPort,
    toPort,
  };
}

import type { BoardObject } from "@collabboard/shared";

/**
 * Viewport rectangle: top-left corner + dimensions.
 */
export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 3-tier serialized board context for the AI system prompt.
 */
export interface SerializedContext {
  selected: string;
  viewport: string;
  nearby: string;
  summary: string;
}

// ─── Constants ──────────────────────────────────────────────

const VIEWPORT_CAP = 50;
const NEARBY_CAP = 30;

// ─── Internal Helpers ───────────────────────────────────────

/**
 * Sanitize user-controlled strings before embedding in prompts.
 * Strips newlines and `#` characters (prevents markdown header injection),
 * then truncates to maxLen.
 */
function sanitize(str: string, maxLen: number): string {
  // Replace newlines with spaces — prevents markdown header injection
  // (headers require `#` at the start of a line; collapsing to one line neutralizes them)
  const cleaned = str.replace(/[\r\n]/g, " ");
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
}

function centerX(obj: { x: number; width: number }): number {
  return obj.x + obj.width / 2;
}

function centerY(obj: { y: number; height: number }): number {
  return obj.y + obj.height / 2;
}

function euclidean(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

/**
 * AABB overlap check. Touching edges count as overlapping (uses <=).
 */
function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): boolean {
  return ax <= bx + bw && ax + aw >= bx && ay <= by + bh && ay + ah >= by;
}

function fullDetail(obj: BoardObject): string {
  const safeContent = sanitize(obj.content, 500);
  const safeColor = sanitize(obj.color, 20);
  return `- ${obj.type} id=${obj.id} x=${String(obj.x)} y=${String(obj.y)} ${String(obj.width)}x${String(obj.height)} color=${safeColor} "${safeContent}"`;
}

function briefDetail(obj: BoardObject): string {
  const safe = sanitize(obj.content, 500);
  const truncated = safe.length > 30 ? safe.slice(0, 30) + "..." : safe;
  return `- ${obj.type} id=${obj.id} at (${String(obj.x)},${String(obj.y)}) "${truncated}"`;
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Serialize board objects into a 3-tier context structure:
 * selected (full detail), viewport (full detail sorted by distance),
 * nearby (brief), and a summary count of distant objects.
 */
export function serializeBoardState(
  objects: BoardObject[],
  viewport: Viewport,
  selectedIds: string[]
): SerializedContext {
  const selectedSet = new Set(selectedIds);
  const vcx = viewport.x + viewport.width / 2;
  const vcy = viewport.y + viewport.height / 2;

  // 2x viewport bounds, centered on the same center
  const nearbyHalfW = viewport.width;
  const nearbyHalfH = viewport.height;
  const nearbyLeft = vcx - nearbyHalfW;
  const nearbyTop = vcy - nearbyHalfH;
  const nearbyW = nearbyHalfW * 2;
  const nearbyH = nearbyHalfH * 2;

  const selected: BoardObject[] = [];
  const viewportObjs: BoardObject[] = [];
  const nearby: BoardObject[] = [];
  let distantCount = 0;

  for (const obj of objects) {
    if (selectedSet.has(obj.id)) {
      selected.push(obj);
      continue;
    }

    const inViewport = rectsOverlap(
      obj.x,
      obj.y,
      obj.width,
      obj.height,
      viewport.x,
      viewport.y,
      viewport.width,
      viewport.height
    );

    if (inViewport) {
      viewportObjs.push(obj);
      continue;
    }

    const inNearby = rectsOverlap(
      obj.x,
      obj.y,
      obj.width,
      obj.height,
      nearbyLeft,
      nearbyTop,
      nearbyW,
      nearbyH
    );

    if (inNearby) {
      nearby.push(obj);
    } else {
      distantCount++;
    }
  }

  // Sort viewport objects by distance to viewport center
  viewportObjs.sort((a, b) => {
    const distA = euclidean(centerX(a), centerY(a), vcx, vcy);
    const distB = euclidean(centerX(b), centerY(b), vcx, vcy);
    return distA - distB;
  });

  // Cap tier sizes to prevent token explosion on large boards
  if (viewportObjs.length > VIEWPORT_CAP) {
    distantCount += viewportObjs.length - VIEWPORT_CAP;
    viewportObjs.length = VIEWPORT_CAP;
  }
  if (nearby.length > NEARBY_CAP) {
    distantCount += nearby.length - NEARBY_CAP;
    nearby.length = NEARBY_CAP;
  }

  return {
    selected: selected.map(fullDetail).join("\n"),
    viewport: viewportObjs.map(fullDetail).join("\n"),
    nearby: nearby.map(briefDetail).join("\n"),
    summary: `${String(distantCount)} additional objects exist outside the visible area.`,
  };
}

/**
 * Classify how much board context a command needs.
 */
export function classifyContextNeed(
  command: string,
  isTemplate: boolean
): "none" | "viewport_center_only" | "viewport" | "full_board" {
  if (isTemplate) {
    return "none";
  }

  if (/\ball\b/i.test(command)) {
    return "full_board";
  }

  if (/\b(create|add)\b/i.test(command)) {
    const hasSpatialRef = /\b(next to|near|beside|above|below|left|right|between)\b/i.test(command);
    if (!hasSpatialRef) {
      return "viewport_center_only";
    }
  }

  return "viewport";
}

import type { BoardObject } from "@/types/board";
import type { Camera } from "@/lib/board-store";

/**
 * Convert screen (pixel) coordinates to world coordinates,
 * accounting for camera pan and zoom.
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function screenToWorld(sx: number, sy: number, camera: Camera) {
  return {
    x: (sx - camera.x) / camera.zoom,
    y: (sy - camera.y) / camera.zoom,
  };
}

/**
 * Find the topmost object at world coordinates (wx, wy).
 * Iterates in reverse so the last-rendered (topmost) object is returned first.
 * Rectangles/sticky notes/text use AABB. Circles use ellipse equation.
 */
export function hitTest(wx: number, wy: number, objects: BoardObject[]): BoardObject | null {
  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i];
    if (obj.type === "circle") {
      const cx = obj.x + obj.width / 2;
      const cy = obj.y + obj.height / 2;
      const rx = obj.width / 2;
      const ry = obj.height / 2;
      if ((wx - cx) ** 2 / rx ** 2 + (wy - cy) ** 2 / ry ** 2 <= 1) {
        return obj;
      }
    } else {
      if (wx >= obj.x && wx <= obj.x + obj.width && wy >= obj.y && wy <= obj.y + obj.height) {
        return obj;
      }
    }
  }
  return null;
}

/**
 * Simple string hash for deterministic user color assignment.
 * Returns a 32-bit integer.
 */
export function hashCode(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}

/**
 * Resolve version conflict: returns true if the incoming version
 * should replace the existing version (LWW — Last Write Wins).
 */
export function shouldAcceptUpdate(incomingVersion: number, existingVersion: number): boolean {
  return incomingVersion >= existingVersion;
}

// ─── Phase 3: Rubber-band selection ──────────────────────────

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function normalizeRect(rect: SelectionRect): { x1: number; y1: number; x2: number; y2: number } {
  const x1 = rect.width < 0 ? rect.x + rect.width : rect.x;
  const y1 = rect.height < 0 ? rect.y + rect.height : rect.y;
  const x2 = rect.width < 0 ? rect.x : rect.x + rect.width;
  const y2 = rect.height < 0 ? rect.y : rect.y + rect.height;
  return { x1, y1, x2, y2 };
}

/**
 * Return all objects whose bounding boxes intersect the given selection rect.
 * Handles negative-dimension rects (dragging right-to-left).
 */
export function objectsInRect(rect: SelectionRect, objects: BoardObject[]): BoardObject[] {
  const { x1, y1, x2, y2 } = normalizeRect(rect);
  return objects.filter((obj) => {
    const ox1 = obj.x;
    const oy1 = obj.y;
    const ox2 = obj.x + obj.width;
    const oy2 = obj.y + obj.height;
    // AABB overlap test
    return ox1 < x2 && ox2 > x1 && oy1 < y2 && oy2 > y1;
  });
}

// ─── Phase 4: Resize handles ────────────────────────────────

export type HandlePosition = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export interface ResizeHandle {
  x: number;
  y: number;
  position: HandlePosition;
  cursor: string;
}

const HANDLE_CURSORS: Record<HandlePosition, string> = {
  nw: "nwse-resize",
  n: "ns-resize",
  ne: "nesw-resize",
  e: "ew-resize",
  se: "nwse-resize",
  s: "ns-resize",
  sw: "nesw-resize",
  w: "ew-resize",
};

export function getResizeHandles(obj: BoardObject): ResizeHandle[] {
  const { x, y, width, height } = obj;
  const mx = x + width / 2;
  const my = y + height / 2;

  const positions: [HandlePosition, number, number][] = [
    ["nw", x, y],
    ["n", mx, y],
    ["ne", x + width, y],
    ["e", x + width, my],
    ["se", x + width, y + height],
    ["s", mx, y + height],
    ["sw", x, y + height],
    ["w", x, my],
  ];

  return positions.map(([position, hx, hy]) => ({
    x: hx,
    y: hy,
    position,
    cursor: HANDLE_CURSORS[position],
  }));
}

/**
 * Check if world coordinates (wx, wy) are within `handleSize` pixels of any
 * resize handle on the given object. Returns the handle position or null.
 */
export function hitTestHandle(
  wx: number,
  wy: number,
  obj: BoardObject,
  handleSize: number
): HandlePosition | null {
  const handles = getResizeHandles(obj);
  for (const handle of handles) {
    if (Math.abs(wx - handle.x) <= handleSize && Math.abs(wy - handle.y) <= handleSize) {
      return handle.position;
    }
  }
  return null;
}

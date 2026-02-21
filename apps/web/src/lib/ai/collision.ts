import type { BoardObject } from "@collabboard/shared";
import type { Viewport } from "./context-pruning";

export const PADDING = 20;
export const MAX_ITERATIONS = 30;

/** Internal epsilon to guard against floating-point drift in overlap checks. */
const EPSILON = 0.5;

// ─── Internal Helpers ───────────────────────────────────────

/** Center X of an object's bounding box. */
function centerX(obj: { x: number; width: number }): number {
  return obj.x + obj.width / 2;
}

/** Center Y of an object's bounding box. */
function centerY(obj: { y: number; height: number }): number {
  return obj.y + obj.height / 2;
}

/** AABB overlap check with padding on each side. */
function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  padding: number
): boolean {
  return (
    a.x < b.x + b.width + padding &&
    a.x + a.width + padding > b.x &&
    a.y < b.y + b.height + padding &&
    a.y + a.height + padding > b.y
  );
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Resolve overlaps among new objects (and against fixed existing objects)
 * using iterative separation. Only new objects are moved; existing objects
 * stay fixed. Returns shallow copies of new objects with adjusted positions.
 *
 * @param _viewport - reserved for future use
 */
export function resolveOverlaps(
  newObjects: BoardObject[],
  existingObjects: BoardObject[],
  _viewport?: Viewport
): BoardObject[] {
  if (newObjects.length === 0) {
    return [];
  }

  // Shallow-copy new objects so originals are not mutated
  const movable = newObjects.map((obj) => ({ ...obj }));

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    let hadOverlap = false;

    for (let i = 0; i < movable.length; i++) {
      const a = movable[i];

      // Check against other movable objects (start at i+1 to visit each pair once)
      for (let j = i + 1; j < movable.length; j++) {
        const b = movable[j];
        if (overlaps(a, b, PADDING + EPSILON)) {
          hadOverlap = true;
          pushApart(a, b);
        }
      }

      // Check against fixed existing objects
      for (const fixed of existingObjects) {
        if (overlaps(a, fixed, PADDING + EPSILON)) {
          hadOverlap = true;
          pushAwayFromFixed(a, fixed);
        }
      }
    }

    if (!hadOverlap) {
      break;
    }
  }

  // Round final positions to integers to eliminate floating-point residue
  for (const obj of movable) {
    obj.x = Math.round(obj.x);
    obj.y = Math.round(obj.y);
  }

  return movable;
}

/**
 * Push object `a` away from object `b` along the axis of minimum overlap.
 * Both objects are movable, so each moves half the required distance.
 */
function pushApart(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): void {
  const overlapX = computeOverlap(a.x, a.width, b.x, b.width, PADDING);
  const overlapY = computeOverlap(a.y, a.height, b.y, b.height, PADDING);

  if (overlapX <= overlapY) {
    // Push along X axis
    const half = overlapX / 2;
    if (centerX(a) <= centerX(b)) {
      a.x -= half;
      b.x += half;
    } else {
      a.x += half;
      b.x -= half;
    }
  } else {
    // Push along Y axis
    const half = overlapY / 2;
    if (centerY(a) <= centerY(b)) {
      a.y -= half;
      b.y += half;
    } else {
      a.y += half;
      b.y -= half;
    }
  }
}

/**
 * Push movable object `a` away from fixed object `b` along the axis
 * of minimum overlap. Only `a` moves.
 */
function pushAwayFromFixed(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): void {
  const overlapX = computeOverlap(a.x, a.width, b.x, b.width, PADDING);
  const overlapY = computeOverlap(a.y, a.height, b.y, b.height, PADDING);

  if (overlapX <= overlapY) {
    if (centerX(a) <= centerX(b)) {
      a.x -= overlapX;
    } else {
      a.x += overlapX;
    }
  } else {
    if (centerY(a) <= centerY(b)) {
      a.y -= overlapY;
    } else {
      a.y += overlapY;
    }
  }
}

/**
 * Compute the overlap (including padding) along one axis.
 */
function computeOverlap(
  aPos: number,
  aSize: number,
  bPos: number,
  bSize: number,
  padding: number
): number {
  const aMin = aPos;
  const aMax = aPos + aSize + padding;
  const bMin = bPos;
  const bMax = bPos + bSize + padding;
  return Math.min(aMax, bMax) - Math.max(aMin, bMin);
}

import { describe, it, expect } from "vitest";
import type { BoardObject, StickyNoteObject } from "@collabboard/shared";
import { resolveOverlaps } from "../collision";

// ─── Test Helpers ────────────────────────────────────────────

const BOARD_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "user-1";
const NOW = "2026-01-01T00:00:00Z";

/**
 * Creates a minimal valid StickyNoteObject for testing.
 */
function makeBoardObject(overrides: Partial<StickyNoteObject> = {}): BoardObject {
  return {
    id: overrides.id ?? "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    board_id: BOARD_ID,
    type: "sticky_note",
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    width: overrides.width ?? 200,
    height: overrides.height ?? 200,
    rotation: 0,
    content: overrides.content ?? "Test note",
    color: overrides.color ?? "#FFEB3B",
    version: 1,
    created_by: USER_ID,
    created_at: NOW,
    updated_at: NOW,
    parent_frame_id: null,
    properties: {},
    ...overrides,
  } as BoardObject;
}

/**
 * Check whether two axis-aligned bounding boxes overlap.
 * Returns true if there is any overlap (gap < 0).
 */
function boxesOverlap(a: BoardObject, b: BoardObject): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/**
 * Compute the gap between two axis-aligned bounding boxes.
 * Returns the minimum separation along any overlapping axis.
 * Negative means overlap.
 */
function minGap(a: BoardObject, b: BoardObject): number {
  const gapX = Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width));
  const gapY = Math.max(b.y - (a.y + a.height), a.y - (b.y + b.height));
  // If separated on either axis, gap is the max of the two
  // If overlapping on both, gap is the max of two negative numbers
  return Math.max(gapX, gapY);
}

// ─── resolveOverlaps ────────────────────────────────────────

describe("resolveOverlaps", () => {
  it("pushes two overlapping objects at the same position apart with >=20px gap", () => {
    const objA = makeBoardObject({
      id: "aaaa0001-0000-0000-0000-000000000000",
      x: 0,
      y: 0,
      width: 200,
      height: 200,
    });
    const objB = makeBoardObject({
      id: "aaaa0002-0000-0000-0000-000000000000",
      x: 0,
      y: 0,
      width: 200,
      height: 200,
    });

    const result = resolveOverlaps([objA, objB], []);

    expect(result).toHaveLength(2);
    const [a, b] = result;
    const gap = minGap(a, b);
    expect(gap).toBeGreaterThanOrEqual(20);
  });

  it("resolves a grid of four overlapping stickies at the same position", () => {
    const objects = [
      makeBoardObject({ id: "bbbb0001-0000-0000-0000-000000000000", x: 0, y: 0 }),
      makeBoardObject({ id: "bbbb0002-0000-0000-0000-000000000000", x: 0, y: 0 }),
      makeBoardObject({ id: "bbbb0003-0000-0000-0000-000000000000", x: 0, y: 0 }),
      makeBoardObject({ id: "bbbb0004-0000-0000-0000-000000000000", x: 0, y: 0 }),
    ];

    const result = resolveOverlaps(objects, []);

    expect(result).toHaveLength(4);
    // No pair of resolved objects should overlap
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        expect(boxesOverlap(result[i], result[j])).toBe(false);
      }
    }
  });

  it("returns non-overlapping objects unchanged", () => {
    const objA = makeBoardObject({
      id: "cccc0001-0000-0000-0000-000000000000",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
    const objB = makeBoardObject({
      id: "cccc0002-0000-0000-0000-000000000000",
      x: 500,
      y: 500,
      width: 100,
      height: 100,
    });

    const result = resolveOverlaps([objA, objB], []);

    expect(result).toHaveLength(2);
    const resultA = result.find((o) => o.id === objA.id);
    const resultB = result.find((o) => o.id === objB.id);
    expect(resultA).toBeDefined();
    expect(resultB).toBeDefined();
    if (resultA && resultB) {
      expect(resultA.x).toBe(0);
      expect(resultA.y).toBe(0);
      expect(resultB.x).toBe(500);
      expect(resultB.y).toBe(500);
    }
  });

  it("returns a single object unchanged", () => {
    const obj = makeBoardObject({
      id: "dddd0001-0000-0000-0000-000000000000",
      x: 100,
      y: 100,
    });

    const result = resolveOverlaps([obj], []);

    expect(result).toHaveLength(1);
    expect(result[0].x).toBe(100);
    expect(result[0].y).toBe(100);
  });

  it("returns empty array for empty input", () => {
    const result = resolveOverlaps([], []);
    expect(result).toEqual([]);
  });

  it("treats existing objects as fixed and only moves new objects", () => {
    const existingObj = makeBoardObject({
      id: "eeee0001-0000-0000-0000-000000000000",
      x: 0,
      y: 0,
      width: 200,
      height: 200,
    });
    const newObj = makeBoardObject({
      id: "eeee0002-0000-0000-0000-000000000000",
      x: 0,
      y: 0,
      width: 200,
      height: 200,
    });

    const result = resolveOverlaps([newObj], [existingObj]);

    // The existing object should not be in the result (only new objects returned)
    // or if returned, it must stay at its original position.
    // The new object must have moved away from the existing one.
    const movedNew = result.find((o) => o.id === newObj.id);
    expect(movedNew).toBeDefined();
    if (movedNew) {
      const gap = minGap(existingObj, movedNew);
      expect(gap).toBeGreaterThanOrEqual(20);
    }

    // Verify existing object was NOT moved (if returned in results)
    const existingInResult = result.find((o) => o.id === existingObj.id);
    if (existingInResult) {
      expect(existingInResult.x).toBe(0);
      expect(existingInResult.y).toBe(0);
    }
  });

  it("keeps objects within reasonable bounds (-50000..50000)", () => {
    // Stack many objects at origin to stress the algorithm
    const objects: BoardObject[] = [];
    for (let i = 0; i < 10; i++) {
      objects.push(
        makeBoardObject({
          id: `ffff${String(i).padStart(4, "0")}-0000-0000-0000-000000000000`,
          x: 0,
          y: 0,
          width: 200,
          height: 200,
        })
      );
    }

    const result = resolveOverlaps(objects, []);

    for (const obj of result) {
      expect(obj.x).toBeGreaterThanOrEqual(-50000);
      expect(obj.x).toBeLessThanOrEqual(50000);
      expect(obj.y).toBeGreaterThanOrEqual(-50000);
      expect(obj.y).toBeLessThanOrEqual(50000);
    }
  });

  it("resolves objects with different sizes (small overlapping large)", () => {
    const large = makeBoardObject({
      id: "gggg0001-0000-0000-0000-000000000000",
      x: 0,
      y: 0,
      width: 400,
      height: 400,
    });
    const small = makeBoardObject({
      id: "gggg0002-0000-0000-0000-000000000000",
      x: 100,
      y: 100,
      width: 50,
      height: 50,
    });

    const result = resolveOverlaps([large, small], []);

    expect(result).toHaveLength(2);
    const resolvedLarge = result.find((o) => o.id === large.id);
    const resolvedSmall = result.find((o) => o.id === small.id);
    expect(resolvedLarge).toBeDefined();
    expect(resolvedSmall).toBeDefined();
    if (resolvedLarge && resolvedSmall) {
      expect(boxesOverlap(resolvedLarge, resolvedSmall)).toBe(false);
    }
  });

  // ─── New edge-case / coverage-gap tests ─────────────────────

  it("two co-located objects have a bounding-box gap of >=20px after resolution", () => {
    // Explicit coordinate math: verify the separation between the edges
    // of the two bounding boxes is at least PADDING (20px).
    const objA = makeBoardObject({
      id: "hhhh0001-0000-0000-0000-000000000000",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
    const objB = makeBoardObject({
      id: "hhhh0002-0000-0000-0000-000000000000",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });

    const result = resolveOverlaps([objA, objB], []);

    expect(result).toHaveLength(2);
    const [a, b] = result;

    // Compute the gap along each axis explicitly.
    const gapRight = b.x - (a.x + a.width); // gap if b is to the right of a
    const gapLeft = a.x - (b.x + b.width); // gap if a is to the right of b
    const gapBelow = b.y - (a.y + a.height); // gap if b is below a
    const gapAbove = a.y - (b.y + b.height); // gap if a is below b

    // The objects are separated along exactly one axis; find which one applies.
    const horizontalGap = Math.max(gapRight, gapLeft);
    const verticalGap = Math.max(gapBelow, gapAbove);
    const actualGap = Math.max(horizontalGap, verticalGap);

    expect(actualGap).toBeGreaterThanOrEqual(20);
  });

  it("5 co-located 200x200 objects all have >=20px gap between adjacent pairs after resolution", () => {
    const objects = [
      makeBoardObject({
        id: "iiii0001-0000-0000-0000-000000000000",
        x: 0,
        y: 0,
        width: 200,
        height: 200,
      }),
      makeBoardObject({
        id: "iiii0002-0000-0000-0000-000000000000",
        x: 0,
        y: 0,
        width: 200,
        height: 200,
      }),
      makeBoardObject({
        id: "iiii0003-0000-0000-0000-000000000000",
        x: 0,
        y: 0,
        width: 200,
        height: 200,
      }),
      makeBoardObject({
        id: "iiii0004-0000-0000-0000-000000000000",
        x: 0,
        y: 0,
        width: 200,
        height: 200,
      }),
      makeBoardObject({
        id: "iiii0005-0000-0000-0000-000000000000",
        x: 0,
        y: 0,
        width: 200,
        height: 200,
      }),
    ];

    const result = resolveOverlaps(objects, []);

    expect(result).toHaveLength(5);
    // Every pair must have >=20px gap between their bounding boxes
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i];
        const b = result[j];
        const gap = minGap(a, b);
        expect(gap).toBeGreaterThanOrEqual(20);
      }
    }
  });

  it("does not mutate the original newObjects array entries", () => {
    // Snapshot the original x/y before calling resolveOverlaps
    const objA = makeBoardObject({
      id: "jjjj0001-0000-0000-0000-000000000000",
      x: 10,
      y: 20,
      width: 200,
      height: 200,
    });
    const objB = makeBoardObject({
      id: "jjjj0002-0000-0000-0000-000000000000",
      x: 10,
      y: 20,
      width: 200,
      height: 200,
    });

    const originalAX = objA.x;
    const originalAY = objA.y;
    const originalBX = objB.x;
    const originalBY = objB.y;

    resolveOverlaps([objA, objB], []);

    // originals must be unchanged — resolveOverlaps uses shallow copies internally
    expect(objA.x).toBe(originalAX);
    expect(objA.y).toBe(originalAY);
    expect(objB.x).toBe(originalBX);
    expect(objB.y).toBe(originalBY);
  });

  it("separates a 1000x1000 object from a 50x50 object with no overlap", () => {
    const bigObj = makeBoardObject({
      id: "kkkk0001-0000-0000-0000-000000000000",
      x: 0,
      y: 0,
      width: 1000,
      height: 1000,
    });
    const smallObj = makeBoardObject({
      id: "kkkk0002-0000-0000-0000-000000000000",
      x: 200,
      y: 200,
      width: 50,
      height: 50,
    });

    const result = resolveOverlaps([bigObj, smallObj], []);

    expect(result).toHaveLength(2);
    const resolvedBig = result.find((o) => o.id === bigObj.id);
    const resolvedSmall = result.find((o) => o.id === smallObj.id);
    expect(resolvedBig).toBeDefined();
    expect(resolvedSmall).toBeDefined();
    if (resolvedBig && resolvedSmall) {
      expect(boxesOverlap(resolvedBig, resolvedSmall)).toBe(false);
    }
  });

  it("objects near extreme positions stay within canvas bounds (-50000..50000) after resolution", () => {
    // Two 200x200 objects at the same position require at most 110px of push each
    // (half of width + padding = (200 + 20) / 2 = 110). Starting at -49800 means
    // the furthest any object can be pushed is -49800 - 110 = -49910, safely within bounds.
    const nearMinA = makeBoardObject({
      id: "llll0001-0000-0000-0000-000000000000",
      x: -49800,
      y: -49800,
      width: 200,
      height: 200,
    });
    const nearMinB = makeBoardObject({
      id: "llll0002-0000-0000-0000-000000000000",
      x: -49800,
      y: -49800,
      width: 200,
      height: 200,
    });

    const resultMin = resolveOverlaps([nearMinA, nearMinB], []);

    for (const obj of resultMin) {
      expect(obj.x).toBeGreaterThanOrEqual(-50000);
      expect(obj.x).toBeLessThanOrEqual(50000);
      expect(obj.y).toBeGreaterThanOrEqual(-50000);
      expect(obj.y).toBeLessThanOrEqual(50000);
    }

    // At the positive boundary: starting at 49700, max push is +110 → 49810, within bounds.
    const nearMaxA = makeBoardObject({
      id: "llll0003-0000-0000-0000-000000000000",
      x: 49700,
      y: 49700,
      width: 200,
      height: 200,
    });
    const nearMaxB = makeBoardObject({
      id: "llll0004-0000-0000-0000-000000000000",
      x: 49700,
      y: 49700,
      width: 200,
      height: 200,
    });

    const resultMax = resolveOverlaps([nearMaxA, nearMaxB], []);

    for (const obj of resultMax) {
      expect(obj.x).toBeGreaterThanOrEqual(-50000);
      expect(obj.x).toBeLessThanOrEqual(50000);
      expect(obj.y).toBeGreaterThanOrEqual(-50000);
      expect(obj.y).toBeLessThanOrEqual(50000);
    }
  });

  it("final positions are integers (no floating-point residue)", () => {
    // Use fractional starting positions to ensure rounding must occur
    const objA = makeBoardObject({
      id: "mmmm0001-0000-0000-0000-000000000000",
      x: 0.7,
      y: 1.3,
      width: 200,
      height: 200,
    });
    const objB = makeBoardObject({
      id: "mmmm0002-0000-0000-0000-000000000000",
      x: 0.7,
      y: 1.3,
      width: 200,
      height: 200,
    });

    const result = resolveOverlaps([objA, objB], []);

    expect(result).toHaveLength(2);
    for (const obj of result) {
      expect(Number.isInteger(obj.x)).toBe(true);
      expect(Number.isInteger(obj.y)).toBe(true);
    }
  });
});

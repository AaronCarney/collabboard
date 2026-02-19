import { describe, it, expect } from "vitest";
import {
  screenToWorld,
  hitTest,
  hashCode,
  shouldAcceptUpdate,
  objectsInRect,
  getResizeHandles,
  hitTestHandle,
} from "../board-logic";
import type { BoardObject } from "@/types/board";

// Helper to create a BoardObject with minimal required fields
function makeObject(
  overrides: Partial<BoardObject> &
    Pick<BoardObject, "id" | "type" | "x" | "y" | "width" | "height">
): BoardObject {
  return {
    board_id: "board-1",
    rotation: 0,
    content: "",
    color: "#000",
    version: 1,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    parent_frame_id: null,
    properties: {},
    ...overrides,
  } as BoardObject;
}

// ─────────────────────────────────────────────────────────────
// screenToWorld
// ─────────────────────────────────────────────────────────────
describe("screenToWorld", () => {
  it("returns identity when camera is at origin with zoom=1", () => {
    const result = screenToWorld(100, 200, { x: 0, y: 0, zoom: 1 });
    expect(result).toEqual({ x: 100, y: 200 });
  });

  it("accounts for camera pan offset", () => {
    // Camera panned 50px right and 100px down means world coords are shifted
    const result = screenToWorld(150, 200, { x: 50, y: 100, zoom: 1 });
    expect(result).toEqual({ x: 100, y: 100 });
  });

  it("accounts for zoom", () => {
    // At zoom=2, screen pixel 200 maps to world 100
    const result = screenToWorld(200, 400, { x: 0, y: 0, zoom: 2 });
    expect(result).toEqual({ x: 100, y: 200 });
  });

  it("combines pan and zoom correctly", () => {
    // Camera at (100, 100) with zoom=2
    // screen (300, 300) → world ((300-100)/2, (300-100)/2) = (100, 100)
    const result = screenToWorld(300, 300, { x: 100, y: 100, zoom: 2 });
    expect(result).toEqual({ x: 100, y: 100 });
  });

  it("handles fractional zoom", () => {
    const result = screenToWorld(50, 50, { x: 0, y: 0, zoom: 0.5 });
    expect(result).toEqual({ x: 100, y: 100 });
  });

  it("handles negative camera position", () => {
    // Camera panned left: x=-100 means world is shifted right
    const result = screenToWorld(0, 0, { x: -100, y: -200, zoom: 1 });
    expect(result).toEqual({ x: 100, y: 200 });
  });
});

// ─────────────────────────────────────────────────────────────
// hitTest — rectangles (AABB)
// ─────────────────────────────────────────────────────────────
describe("hitTest — rectangles", () => {
  const rect = makeObject({
    id: "rect-1",
    type: "rectangle",
    x: 100,
    y: 100,
    width: 200,
    height: 150,
  });

  it("returns the object when point is inside", () => {
    expect(hitTest(150, 150, [rect])).toBe(rect);
  });

  it("returns the object when point is on the top-left edge", () => {
    expect(hitTest(100, 100, [rect])).toBe(rect);
  });

  it("returns the object when point is on the bottom-right edge", () => {
    expect(hitTest(300, 250, [rect])).toBe(rect);
  });

  it("returns null when point is outside", () => {
    expect(hitTest(50, 50, [rect])).toBeNull();
  });

  it("returns null when point is just beyond the right edge", () => {
    expect(hitTest(301, 150, [rect])).toBeNull();
  });

  it("returns null when point is just below the bottom edge", () => {
    expect(hitTest(150, 251, [rect])).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// hitTest — circles (ellipse equation)
// ─────────────────────────────────────────────────────────────
describe("hitTest — circles", () => {
  // Circle centered at (175, 175), radius 75 in both axes
  const circle = makeObject({
    id: "circle-1",
    type: "circle",
    x: 100,
    y: 100,
    width: 150,
    height: 150,
  });

  it("returns the object when point is at center", () => {
    expect(hitTest(175, 175, [circle])).toBe(circle);
  });

  it("returns the object when point is inside near edge", () => {
    // Just inside the top of the circle
    expect(hitTest(175, 105, [circle])).toBe(circle);
  });

  it("returns null when point is in the corner of the bounding box", () => {
    // Top-left corner of bounding box — inside AABB but outside ellipse
    expect(hitTest(101, 101, [circle])).toBeNull();
  });

  it("returns null when point is clearly outside", () => {
    expect(hitTest(50, 50, [circle])).toBeNull();
  });

  it("handles ellipses (non-equal width/height)", () => {
    const ellipse = makeObject({
      id: "ellipse-1",
      type: "circle",
      x: 0,
      y: 0,
      width: 200,
      height: 100,
    });
    // Center is at (100, 50), rx=100, ry=50
    // Point at (100, 50) is the center — should hit
    expect(hitTest(100, 50, [ellipse])).toBe(ellipse);
    // Point at (195, 50) is near the right edge — should hit (within rx=100)
    expect(hitTest(195, 50, [ellipse])).toBe(ellipse);
    // Point at (100, 5) is near the top edge (ry=50, center y=50) — should hit
    expect(hitTest(100, 5, [ellipse])).toBe(ellipse);
    // Point at (195, 5) is in the corner — outside ellipse
    expect(hitTest(195, 5, [ellipse])).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// hitTest — z-order (topmost object wins)
// ─────────────────────────────────────────────────────────────
describe("hitTest — z-order", () => {
  const bottom = makeObject({
    id: "bottom",
    type: "rectangle",
    x: 0,
    y: 0,
    width: 200,
    height: 200,
  });
  const top = makeObject({ id: "top", type: "rectangle", x: 50, y: 50, width: 200, height: 200 });

  it("returns the topmost (last in array) when objects overlap", () => {
    const result = hitTest(100, 100, [bottom, top]);
    expect(result?.id).toBe("top");
  });

  it("returns the bottom object when point only hits bottom", () => {
    const result = hitTest(10, 10, [bottom, top]);
    expect(result?.id).toBe("bottom");
  });

  it("returns null when point hits nothing", () => {
    expect(hitTest(300, 300, [bottom, top])).toBeNull();
  });

  it("returns null for empty objects array", () => {
    expect(hitTest(100, 100, [])).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// hitTest — sticky notes and text use AABB like rectangles
// ─────────────────────────────────────────────────────────────
describe("hitTest — sticky notes and text", () => {
  const sticky = makeObject({
    id: "sticky-1",
    type: "sticky_note",
    x: 0,
    y: 0,
    width: 200,
    height: 200,
  });
  const text = makeObject({ id: "text-1", type: "text", x: 300, y: 300, width: 200, height: 40 });

  it("hits a sticky note inside its bounds", () => {
    expect(hitTest(100, 100, [sticky])).toBe(sticky);
  });

  it("misses a sticky note outside its bounds", () => {
    expect(hitTest(201, 100, [sticky])).toBeNull();
  });

  it("hits a text object inside its bounds", () => {
    expect(hitTest(400, 320, [text])).toBe(text);
  });

  it("misses a text object outside its bounds", () => {
    expect(hitTest(400, 341, [text])).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// hashCode
// ─────────────────────────────────────────────────────────────
describe("hashCode", () => {
  it("is deterministic — same input always produces same output", () => {
    expect(hashCode("user_123")).toBe(hashCode("user_123"));
  });

  it("produces different hashes for different inputs", () => {
    expect(hashCode("user_1")).not.toBe(hashCode("user_2"));
  });

  it("returns 0 for empty string", () => {
    expect(hashCode("")).toBe(0);
  });

  it("handles unicode characters", () => {
    const hash = hashCode("用户");
    expect(typeof hash).toBe("number");
    expect(Number.isInteger(hash)).toBe(true);
  });

  it("returns a 32-bit integer (no overflow to float)", () => {
    // Long string to stress the hash
    const hash = hashCode("a".repeat(10000));
    expect(Number.isInteger(hash)).toBe(true);
    expect(hash).toBeGreaterThanOrEqual(-2147483648);
    expect(hash).toBeLessThanOrEqual(2147483647);
  });

  it("distributes across USER_COLORS range", () => {
    // 20 different user IDs should produce at least 3 different color indices
    const indices = new Set<number>();
    for (let i = 0; i < 20; i++) {
      indices.add(Math.abs(hashCode("user_" + String(i))) % 12);
    }
    expect(indices.size).toBeGreaterThanOrEqual(3);
  });
});

// ─────────────────────────────────────────────────────────────
// shouldAcceptUpdate (LWW version conflict resolution)
// ─────────────────────────────────────────────────────────────
describe("shouldAcceptUpdate", () => {
  it("accepts when incoming version is greater", () => {
    expect(shouldAcceptUpdate(5, 3)).toBe(true);
  });

  it("accepts when versions are equal (last write wins)", () => {
    expect(shouldAcceptUpdate(3, 3)).toBe(true);
  });

  it("rejects when incoming version is older", () => {
    expect(shouldAcceptUpdate(2, 3)).toBe(false);
  });

  it("works with version 1 (newly created objects)", () => {
    expect(shouldAcceptUpdate(1, 1)).toBe(true);
    expect(shouldAcceptUpdate(2, 1)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// objectsInRect (Phase 3 — rubber-band selection)
// ─────────────────────────────────────────────────────────────
describe("objectsInRect", () => {
  const r1 = makeObject({ id: "r1", type: "rectangle", x: 50, y: 50, width: 100, height: 100 });
  const r2 = makeObject({ id: "r2", type: "rectangle", x: 300, y: 300, width: 100, height: 100 });
  const c1 = makeObject({ id: "c1", type: "circle", x: 200, y: 200, width: 80, height: 80 });

  it("returns objects fully contained in the selection rect", () => {
    const result = objectsInRect({ x: 40, y: 40, width: 120, height: 120 }, [r1, r2, c1]);
    expect(result.map((o) => o.id)).toEqual(["r1"]);
  });

  it("returns objects that overlap (not just fully contained)", () => {
    // Selection overlaps r1 partially
    const result = objectsInRect({ x: 100, y: 100, width: 150, height: 150 }, [r1, r2, c1]);
    expect(result.map((o) => o.id)).toContain("r1");
    expect(result.map((o) => o.id)).toContain("c1");
  });

  it("returns empty when no objects intersect", () => {
    const result = objectsInRect({ x: 500, y: 500, width: 100, height: 100 }, [r1, r2, c1]);
    expect(result).toEqual([]);
  });

  it("handles negative-dimension rects (dragging right-to-left)", () => {
    // Equivalent to {x: 40, y: 40, width: 120, height: 120}
    const result = objectsInRect({ x: 160, y: 160, width: -120, height: -120 }, [r1, r2, c1]);
    expect(result.map((o) => o.id)).toContain("r1");
  });

  it("handles circles using bounding-box intersection", () => {
    // Selection that just clips the circle's bounding box
    const result = objectsInRect({ x: 270, y: 270, width: 20, height: 20 }, [c1]);
    // c1 is at 200-280, 200-280. Selection 270-290 overlaps
    expect(result.map((o) => o.id)).toContain("c1");
  });
});

// ─────────────────────────────────────────────────────────────
// getResizeHandles (Phase 4)
// ─────────────────────────────────────────────────────────────
describe("getResizeHandles", () => {
  const rect = makeObject({ id: "r1", type: "rectangle", x: 100, y: 100, width: 200, height: 150 });

  it("returns 8 handles", () => {
    const handles = getResizeHandles(rect);
    expect(handles).toHaveLength(8);
  });

  it("has corners at the correct positions", () => {
    const handles = getResizeHandles(rect);
    const nw = handles.find((h) => h.position === "nw");
    const se = handles.find((h) => h.position === "se");
    expect(nw).toBeDefined();
    expect(se).toBeDefined();
    if (nw && se) {
      expect(nw.x).toBe(100);
      expect(nw.y).toBe(100);
      expect(se.x).toBe(300);
      expect(se.y).toBe(250);
    }
  });

  it("has edge midpoints at the correct positions", () => {
    const handles = getResizeHandles(rect);
    const n = handles.find((h) => h.position === "n");
    const e = handles.find((h) => h.position === "e");
    expect(n).toBeDefined();
    expect(e).toBeDefined();
    if (n && e) {
      expect(n.x).toBe(200); // midpoint x
      expect(n.y).toBe(100); // top edge
      expect(e.x).toBe(300); // right edge
      expect(e.y).toBe(175); // midpoint y
    }
  });
});

// ─────────────────────────────────────────────────────────────
// hitTestHandle (Phase 4)
// ─────────────────────────────────────────────────────────────
describe("hitTestHandle", () => {
  const rect = makeObject({ id: "r1", type: "rectangle", x: 100, y: 100, width: 200, height: 150 });

  it("returns the handle position when clicking near a corner", () => {
    // SE corner is at (300, 250)
    const result = hitTestHandle(302, 248, rect, 8);
    expect(result).toBe("se");
  });

  it("returns null when clicking away from handles", () => {
    const result = hitTestHandle(200, 175, rect, 8);
    expect(result).toBeNull();
  });

  it("returns the correct edge handle", () => {
    // N edge midpoint is at (200, 100)
    const result = hitTestHandle(200, 98, rect, 8);
    expect(result).toBe("n");
  });
});

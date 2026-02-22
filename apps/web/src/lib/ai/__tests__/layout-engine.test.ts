import { describe, it, expect } from "vitest";
import type { BoardObject, StickyNoteObject, ConnectorObject } from "@collabboard/shared";
import {
  computeDagLayout,
  computeGridLayout,
  computeStackLayout,
  computeRadialLayout,
  suggestConnectorPorts,
} from "../layout-engine";

// ─── Test Helpers ────────────────────────────────────────────

const BOARD_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "user-1";
const NOW = "2026-01-01T00:00:00Z";

function makeObject(overrides: Partial<StickyNoteObject> = {}): BoardObject {
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

function makeConnector(fromId: string, toId: string, id?: string): BoardObject {
  return {
    id: id ?? "cccccccc-cccc-cccc-cccc-cccccccccccc",
    board_id: BOARD_ID,
    type: "connector",
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rotation: 0,
    content: "",
    color: "#333333",
    version: 1,
    created_by: USER_ID,
    created_at: NOW,
    updated_at: NOW,
    parent_frame_id: null,
    properties: {
      from_object_id: fromId,
      to_object_id: toId,
      from_port: "bottom" as const,
      to_port: "top" as const,
      arrow_style: "end" as const,
      stroke_style: "solid" as const,
    },
  } as ConnectorObject;
}

function uniqueId(index: number): string {
  const hex = index.toString(16).padStart(8, "0");
  return `${hex}-0000-0000-0000-000000000000`;
}

/** Find an object by id in a result array, throwing if not found. */
function findById(objects: BoardObject[], id: string): BoardObject {
  const found = objects.find((o) => o.id === id);
  if (!found) {
    throw new Error(`Object with id ${id} not found in results`);
  }
  return found;
}

// ─── AC1: computeDagLayout — basic DAG layout ───────────────

describe("computeDagLayout", () => {
  it("AC1: arranges nodes in DAG hierarchy with connectors", () => {
    const a = makeObject({ id: uniqueId(1) });
    const b = makeObject({ id: uniqueId(2) });
    const c = makeObject({ id: uniqueId(3) });
    const connAB = makeConnector(a.id, b.id, uniqueId(10));
    const connAC = makeConnector(a.id, c.id, uniqueId(11));

    const result = computeDagLayout([a, b, c], [connAB, connAC]);

    expect(result.objects).toHaveLength(3);
    // Parent A should be above children B and C in TB layout
    const layoutA = findById(result.objects, a.id);
    const layoutB = findById(result.objects, b.id);
    const layoutC = findById(result.objects, c.id);
    expect(layoutA.y).toBeLessThan(layoutB.y);
    expect(layoutA.y).toBeLessThan(layoutC.y);
  });

  // AC2: direction option
  it("AC2: respects LR direction option", () => {
    const a = makeObject({ id: uniqueId(1) });
    const b = makeObject({ id: uniqueId(2) });
    const conn = makeConnector(a.id, b.id, uniqueId(10));

    const result = computeDagLayout([a, b], [conn], { direction: "LR" });

    const layoutA = findById(result.objects, a.id);
    const layoutB = findById(result.objects, b.id);
    // LR: parent should be to the left of child
    expect(layoutA.x).toBeLessThan(layoutB.x);
  });

  it("AC2: respects BT direction option", () => {
    const a = makeObject({ id: uniqueId(1) });
    const b = makeObject({ id: uniqueId(2) });
    const conn = makeConnector(a.id, b.id, uniqueId(10));

    const result = computeDagLayout([a, b], [conn], { direction: "BT" });

    const layoutA = findById(result.objects, a.id);
    const layoutB = findById(result.objects, b.id);
    // BT: parent should be below child
    expect(layoutA.y).toBeGreaterThan(layoutB.y);
  });

  it("AC2: respects RL direction option", () => {
    const a = makeObject({ id: uniqueId(1) });
    const b = makeObject({ id: uniqueId(2) });
    const conn = makeConnector(a.id, b.id, uniqueId(10));

    const result = computeDagLayout([a, b], [conn], { direction: "RL" });

    const layoutA = findById(result.objects, a.id);
    const layoutB = findById(result.objects, b.id);
    // RL: parent should be to the right of child
    expect(layoutA.x).toBeGreaterThan(layoutB.x);
  });

  // AC3: spacing option
  it("AC3: respects custom spacing", () => {
    const a = makeObject({ id: uniqueId(1), width: 100, height: 100 });
    const b = makeObject({ id: uniqueId(2), width: 100, height: 100 });
    const conn = makeConnector(a.id, b.id, uniqueId(10));

    const small = computeDagLayout([a, b], [conn], { spacing: 20 });
    const large = computeDagLayout([a, b], [conn], { spacing: 200 });

    const smallA = findById(small.objects, a.id);
    const smallB = findById(small.objects, b.id);
    const largeA = findById(large.objects, a.id);
    const largeB = findById(large.objects, b.id);

    const smallGap = smallB.y - (smallA.y + smallA.height);
    const largeGap = largeB.y - (largeA.y + largeA.height);
    expect(largeGap).toBeGreaterThan(smallGap);
  });

  // AC4: empty input
  it("AC4: returns empty result for empty input", () => {
    const result = computeDagLayout([], []);
    expect(result.objects).toHaveLength(0);
    expect(result.boundingBox).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  // AC5: single object
  it("AC5: handles single object", () => {
    const obj = makeObject({ id: uniqueId(1), x: 50, y: 50 });
    const result = computeDagLayout([obj], []);
    expect(result.objects).toHaveLength(1);
  });

  // AC6: does not mutate originals
  it("AC6: does not mutate original objects", () => {
    const a = makeObject({ id: uniqueId(1), x: 100, y: 100 });
    const b = makeObject({ id: uniqueId(2), x: 200, y: 200 });
    const conn = makeConnector(a.id, b.id, uniqueId(10));
    const origAx = a.x;
    const origAy = a.y;

    computeDagLayout([a, b], [conn]);

    expect(a.x).toBe(origAx);
    expect(a.y).toBe(origAy);
  });

  // AC7: returns bounding box
  it("AC7: returns correct bounding box", () => {
    const a = makeObject({ id: uniqueId(1), width: 100, height: 100 });
    const b = makeObject({ id: uniqueId(2), width: 100, height: 100 });
    const conn = makeConnector(a.id, b.id, uniqueId(10));

    const result = computeDagLayout([a, b], [conn]);

    expect(result.boundingBox.width).toBeGreaterThan(0);
    expect(result.boundingBox.height).toBeGreaterThan(0);
    // Bounding box should contain all objects
    for (const obj of result.objects) {
      expect(obj.x).toBeGreaterThanOrEqual(result.boundingBox.x);
      expect(obj.y).toBeGreaterThanOrEqual(result.boundingBox.y);
      expect(obj.x + obj.width).toBeLessThanOrEqual(
        result.boundingBox.x + result.boundingBox.width
      );
      expect(obj.y + obj.height).toBeLessThanOrEqual(
        result.boundingBox.y + result.boundingBox.height
      );
    }
  });

  // AC8: ignores connectors referencing objects not in the list
  it("AC8: ignores connectors referencing unknown objects", () => {
    const a = makeObject({ id: uniqueId(1) });
    const b = makeObject({ id: uniqueId(2) });
    const orphanConn = makeConnector(a.id, uniqueId(99), uniqueId(10));

    const result = computeDagLayout([a, b], [orphanConn]);
    expect(result.objects).toHaveLength(2);
  });

  // AC9: positions are integers
  it("AC9: all positions are integers", () => {
    const objects = Array.from({ length: 5 }, (_, i) =>
      makeObject({ id: uniqueId(i), width: 150, height: 80 })
    );
    const conns = [
      makeConnector(objects[0].id, objects[1].id, uniqueId(10)),
      makeConnector(objects[0].id, objects[2].id, uniqueId(11)),
      makeConnector(objects[1].id, objects[3].id, uniqueId(12)),
      makeConnector(objects[2].id, objects[4].id, uniqueId(13)),
    ];

    const result = computeDagLayout(objects, conns);
    for (const obj of result.objects) {
      expect(Number.isInteger(obj.x)).toBe(true);
      expect(Number.isInteger(obj.y)).toBe(true);
    }
  });

  // AC10: positions are clamped to bounds
  it("AC10: clamps positions to MIN_POSITION/MAX_POSITION", () => {
    const objects = Array.from({ length: 2 }, (_, i) => makeObject({ id: uniqueId(i) }));
    const conn = makeConnector(objects[0].id, objects[1].id, uniqueId(10));

    const result = computeDagLayout(objects, [conn]);
    for (const obj of result.objects) {
      expect(obj.x).toBeGreaterThanOrEqual(-50000);
      expect(obj.x).toBeLessThanOrEqual(50000);
      expect(obj.y).toBeGreaterThanOrEqual(-50000);
      expect(obj.y).toBeLessThanOrEqual(50000);
    }
  });

  it("ignores non-connector objects in connectors array", () => {
    const a = makeObject({ id: uniqueId(1) });
    const b = makeObject({ id: uniqueId(2) });
    const notConnector = makeObject({ id: uniqueId(3) });

    const result = computeDagLayout([a, b], [notConnector]);
    expect(result.objects).toHaveLength(2);
  });

  it("default direction is TB", () => {
    const a = makeObject({ id: uniqueId(1) });
    const b = makeObject({ id: uniqueId(2) });
    const conn = makeConnector(a.id, b.id, uniqueId(10));

    const result = computeDagLayout([a, b], [conn]);
    const layoutA = findById(result.objects, a.id);
    const layoutB = findById(result.objects, b.id);
    expect(layoutA.y).toBeLessThan(layoutB.y);
  });
});

// ─── AC11-AC13: computeGridLayout ───────────────────────────

describe("computeGridLayout", () => {
  it("AC11: arranges objects in a grid with default 3 columns", () => {
    const objects = Array.from({ length: 6 }, (_, i) =>
      makeObject({ id: uniqueId(i), width: 100, height: 100 })
    );

    const result = computeGridLayout(objects);

    expect(result.objects).toHaveLength(6);
    // First row: 0,1,2 should have same y
    expect(result.objects[0].y).toBe(result.objects[1].y);
    expect(result.objects[1].y).toBe(result.objects[2].y);
    // Second row: 3,4,5 should have same y, different from first row
    expect(result.objects[3].y).toBe(result.objects[4].y);
    expect(result.objects[3].y).toBeGreaterThan(result.objects[0].y);
    // Columns: x increases left to right
    expect(result.objects[0].x).toBeLessThan(result.objects[1].x);
    expect(result.objects[1].x).toBeLessThan(result.objects[2].x);
  });

  it("AC11: respects custom columns option", () => {
    const objects = Array.from({ length: 4 }, (_, i) =>
      makeObject({ id: uniqueId(i), width: 100, height: 100 })
    );

    const result = computeGridLayout(objects, { columns: 2 });

    // Row 0: obj 0, 1; Row 1: obj 2, 3
    expect(result.objects[0].y).toBe(result.objects[1].y);
    expect(result.objects[2].y).toBe(result.objects[3].y);
    expect(result.objects[2].y).toBeGreaterThan(result.objects[0].y);
  });

  it("AC12: respects custom gap", () => {
    const objects = Array.from({ length: 2 }, (_, i) =>
      makeObject({ id: uniqueId(i), width: 100, height: 100 })
    );

    const small = computeGridLayout(objects, { gap: 10 });
    const large = computeGridLayout(objects, { gap: 100 });

    const smallDx = small.objects[1].x - small.objects[0].x;
    const largeDx = large.objects[1].x - large.objects[0].x;
    expect(largeDx).toBeGreaterThan(smallDx);
  });

  it("AC12: respects origin option", () => {
    const objects = [makeObject({ id: uniqueId(1), width: 100, height: 100 })];

    const result = computeGridLayout(objects, { origin: { x: 500, y: 300 } });

    expect(result.objects[0].x).toBe(500);
    expect(result.objects[0].y).toBe(300);
  });

  it("AC13: returns empty result for empty input", () => {
    const result = computeGridLayout([]);
    expect(result.objects).toHaveLength(0);
    expect(result.boundingBox).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it("does not mutate original objects", () => {
    const obj = makeObject({ id: uniqueId(1), x: 999, y: 999 });
    computeGridLayout([obj], { origin: { x: 0, y: 0 } });
    expect(obj.x).toBe(999);
    expect(obj.y).toBe(999);
  });

  it("returns bounding box that contains all objects", () => {
    const objects = Array.from({ length: 4 }, (_, i) =>
      makeObject({ id: uniqueId(i), width: 100, height: 100 })
    );

    const result = computeGridLayout(objects, { columns: 2 });

    for (const obj of result.objects) {
      expect(obj.x).toBeGreaterThanOrEqual(result.boundingBox.x);
      expect(obj.y).toBeGreaterThanOrEqual(result.boundingBox.y);
    }
  });

  it("handles columns = 1", () => {
    const objects = Array.from({ length: 3 }, (_, i) =>
      makeObject({ id: uniqueId(i), width: 100, height: 100 })
    );

    const result = computeGridLayout(objects, { columns: 1 });

    // All should have same x
    expect(result.objects[0].x).toBe(result.objects[1].x);
    expect(result.objects[1].x).toBe(result.objects[2].x);
    // Different y
    expect(result.objects[0].y).toBeLessThan(result.objects[1].y);
    expect(result.objects[1].y).toBeLessThan(result.objects[2].y);
  });

  it("clamps columns to at least 1", () => {
    const objects = [makeObject({ id: uniqueId(1) })];
    const result = computeGridLayout(objects, { columns: 0 });
    expect(result.objects).toHaveLength(1);
  });

  it("respects explicit cellWidth and cellHeight", () => {
    const objects = Array.from({ length: 2 }, (_, i) =>
      makeObject({ id: uniqueId(i), width: 50, height: 50 })
    );

    const result = computeGridLayout(objects, {
      cellWidth: 200,
      cellHeight: 200,
      gap: 10,
    });

    // Second object x should be at cellWidth + gap
    expect(result.objects[1].x).toBe(210);
  });
});

// ─── AC14-AC16: computeStackLayout ──────────────────────────

describe("computeStackLayout", () => {
  it("AC14: vertical stack places objects top to bottom", () => {
    const objects = Array.from({ length: 3 }, (_, i) =>
      makeObject({ id: uniqueId(i), width: 100, height: 80 })
    );

    const result = computeStackLayout(objects, { direction: "vertical" });

    expect(result.objects[0].y).toBeLessThan(result.objects[1].y);
    expect(result.objects[1].y).toBeLessThan(result.objects[2].y);
  });

  it("AC14: horizontal stack places objects left to right", () => {
    const objects = Array.from({ length: 3 }, (_, i) =>
      makeObject({ id: uniqueId(i), width: 100, height: 80 })
    );

    const result = computeStackLayout(objects, { direction: "horizontal" });

    expect(result.objects[0].x).toBeLessThan(result.objects[1].x);
    expect(result.objects[1].x).toBeLessThan(result.objects[2].x);
  });

  it("AC15: respects gap option", () => {
    const objects = Array.from({ length: 2 }, (_, i) =>
      makeObject({ id: uniqueId(i), width: 100, height: 100 })
    );

    const result = computeStackLayout(objects, {
      direction: "vertical",
      gap: 50,
    });

    const gap = result.objects[1].y - (result.objects[0].y + result.objects[0].height);
    expect(gap).toBe(50);
  });

  it("AC15: respects origin option", () => {
    const objects = [makeObject({ id: uniqueId(1), width: 100, height: 100 })];

    const result = computeStackLayout(objects, {
      origin: { x: 300, y: 400 },
    });

    expect(result.objects[0].x).toBe(300);
    expect(result.objects[0].y).toBe(400);
  });

  it("AC15: center alignment in vertical stack", () => {
    const narrow = makeObject({ id: uniqueId(1), width: 100, height: 80 });
    const wide = makeObject({ id: uniqueId(2), width: 200, height: 80 });

    const result = computeStackLayout([narrow, wide], {
      direction: "vertical",
      align: "center",
      origin: { x: 0, y: 0 },
    });

    // Narrow should be centered relative to wide
    const narrowCenter = result.objects[0].x + result.objects[0].width / 2;
    const wideCenter = result.objects[1].x + result.objects[1].width / 2;
    expect(Math.abs(narrowCenter - wideCenter)).toBeLessThanOrEqual(1);
  });

  it("AC15: end alignment in vertical stack", () => {
    const narrow = makeObject({ id: uniqueId(1), width: 100, height: 80 });
    const wide = makeObject({ id: uniqueId(2), width: 200, height: 80 });

    const result = computeStackLayout([narrow, wide], {
      direction: "vertical",
      align: "end",
      origin: { x: 0, y: 0 },
    });

    // Right edges should align
    const narrowRight = result.objects[0].x + result.objects[0].width;
    const wideRight = result.objects[1].x + result.objects[1].width;
    expect(Math.abs(narrowRight - wideRight)).toBeLessThanOrEqual(1);
  });

  it("AC16: returns empty result for empty input", () => {
    const result = computeStackLayout([]);
    expect(result.objects).toHaveLength(0);
    expect(result.boundingBox).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it("does not mutate original objects", () => {
    const obj = makeObject({ id: uniqueId(1), x: 999, y: 999 });
    computeStackLayout([obj], { origin: { x: 0, y: 0 } });
    expect(obj.x).toBe(999);
    expect(obj.y).toBe(999);
  });

  it("returns bounding box", () => {
    const objects = Array.from({ length: 3 }, (_, i) =>
      makeObject({ id: uniqueId(i), width: 100, height: 100 })
    );

    const result = computeStackLayout(objects, { direction: "vertical", gap: 10 });

    expect(result.boundingBox.height).toBeGreaterThan(0);
    expect(result.boundingBox.width).toBeGreaterThan(0);
  });

  it("default direction is vertical", () => {
    const objects = Array.from({ length: 2 }, (_, i) =>
      makeObject({ id: uniqueId(i), width: 100, height: 100 })
    );

    const result = computeStackLayout(objects);

    expect(result.objects[0].y).toBeLessThan(result.objects[1].y);
    // Same x (start alignment default)
    expect(result.objects[0].x).toBe(result.objects[1].x);
  });

  it("horizontal stack with center alignment", () => {
    const short = makeObject({ id: uniqueId(1), width: 80, height: 50 });
    const tall = makeObject({ id: uniqueId(2), width: 80, height: 150 });

    const result = computeStackLayout([short, tall], {
      direction: "horizontal",
      align: "center",
      origin: { x: 0, y: 0 },
    });

    const shortCenter = result.objects[0].y + result.objects[0].height / 2;
    const tallCenter = result.objects[1].y + result.objects[1].height / 2;
    expect(Math.abs(shortCenter - tallCenter)).toBeLessThanOrEqual(1);
  });
});

// ─── AC17-AC19: computeRadialLayout ─────────────────────────

describe("computeRadialLayout", () => {
  it("AC17: arranges objects in a circle", () => {
    const objects = Array.from({ length: 4 }, (_, i) =>
      makeObject({ id: uniqueId(i), width: 80, height: 80 })
    );

    const result = computeRadialLayout(objects, {
      centerX: 0,
      centerY: 0,
      radius: 200,
    });

    expect(result.objects).toHaveLength(4);
    // All objects should be roughly equidistant from center
    const distances = result.objects.map((obj) => {
      const cx = obj.x + obj.width / 2;
      const cy = obj.y + obj.height / 2;
      return Math.sqrt(cx * cx + cy * cy);
    });
    for (const d of distances) {
      expect(d).toBeCloseTo(200, -1);
    }
  });

  it("AC17: respects custom radius", () => {
    const objects = Array.from({ length: 3 }, (_, i) =>
      makeObject({ id: uniqueId(i), width: 80, height: 80 })
    );

    const small = computeRadialLayout(objects, { radius: 100, centerX: 0, centerY: 0 });
    const large = computeRadialLayout(objects, { radius: 500, centerX: 0, centerY: 0 });

    const smallBB = small.boundingBox;
    const largeBB = large.boundingBox;
    expect(largeBB.width).toBeGreaterThan(smallBB.width);
  });

  it("AC18: respects center position", () => {
    const objects = [makeObject({ id: uniqueId(1), width: 80, height: 80 })];

    const result = computeRadialLayout(objects, {
      centerX: 500,
      centerY: 300,
    });

    // Single object should be centered at the given center
    const cx = result.objects[0].x + result.objects[0].width / 2;
    const cy = result.objects[0].y + result.objects[0].height / 2;
    expect(Math.abs(cx - 500)).toBeLessThanOrEqual(1);
    expect(Math.abs(cy - 300)).toBeLessThanOrEqual(1);
  });

  it("AC18: respects startAngle", () => {
    // Use 3 objects so positions differ clearly between start angles
    const objects = Array.from({ length: 3 }, (_, i) =>
      makeObject({ id: uniqueId(i), width: 80, height: 80 })
    );

    // Default startAngle is -PI/2 (top)
    const resultDefault = computeRadialLayout(objects, {
      centerX: 0,
      centerY: 0,
      radius: 200,
    });
    // Custom startAngle = 0 (right)
    const resultCustom = computeRadialLayout(objects, {
      centerX: 0,
      centerY: 0,
      radius: 200,
      startAngle: 0,
    });

    // First object positions should differ due to different start angles
    const defaultPos = { x: resultDefault.objects[0].x, y: resultDefault.objects[0].y };
    const customPos = { x: resultCustom.objects[0].x, y: resultCustom.objects[0].y };
    const positionsDiffer = defaultPos.x !== customPos.x || defaultPos.y !== customPos.y;
    expect(positionsDiffer).toBe(true);
  });

  it("AC19: returns empty result for empty input", () => {
    const result = computeRadialLayout([]);
    expect(result.objects).toHaveLength(0);
    expect(result.boundingBox).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it("does not mutate original objects", () => {
    const obj = makeObject({ id: uniqueId(1), x: 999, y: 999 });
    computeRadialLayout([obj], { centerX: 0, centerY: 0 });
    expect(obj.x).toBe(999);
    expect(obj.y).toBe(999);
  });

  it("returns bounding box that contains all objects", () => {
    const objects = Array.from({ length: 6 }, (_, i) =>
      makeObject({ id: uniqueId(i), width: 80, height: 80 })
    );

    const result = computeRadialLayout(objects, {
      centerX: 0,
      centerY: 0,
      radius: 200,
    });

    for (const obj of result.objects) {
      expect(obj.x).toBeGreaterThanOrEqual(result.boundingBox.x);
      expect(obj.y).toBeGreaterThanOrEqual(result.boundingBox.y);
      expect(obj.x + obj.width).toBeLessThanOrEqual(
        result.boundingBox.x + result.boundingBox.width + 1
      );
      expect(obj.y + obj.height).toBeLessThanOrEqual(
        result.boundingBox.y + result.boundingBox.height + 1
      );
    }
  });

  it("positions are integers", () => {
    const objects = Array.from({ length: 7 }, (_, i) =>
      makeObject({ id: uniqueId(i), width: 80, height: 80 })
    );

    const result = computeRadialLayout(objects, {
      centerX: 0,
      centerY: 0,
      radius: 200,
    });

    for (const obj of result.objects) {
      expect(Number.isInteger(obj.x)).toBe(true);
      expect(Number.isInteger(obj.y)).toBe(true);
    }
  });

  it("positions are clamped to bounds", () => {
    const objects = Array.from({ length: 4 }, (_, i) =>
      makeObject({ id: uniqueId(i), width: 80, height: 80 })
    );

    const result = computeRadialLayout(objects, {
      centerX: 49900,
      centerY: 49900,
      radius: 200,
    });

    for (const obj of result.objects) {
      expect(obj.x).toBeGreaterThanOrEqual(-50000);
      expect(obj.x).toBeLessThanOrEqual(50000);
      expect(obj.y).toBeGreaterThanOrEqual(-50000);
      expect(obj.y).toBeLessThanOrEqual(50000);
    }
  });
});

// ─── AC20-AC23: suggestConnectorPorts ────────────────────────

describe("suggestConnectorPorts", () => {
  it("AC20: suggests right/left for horizontally adjacent objects", () => {
    const left = makeObject({ id: uniqueId(1), x: 0, y: 0, width: 100, height: 100 });
    const right = makeObject({ id: uniqueId(2), x: 300, y: 0, width: 100, height: 100 });

    const suggestion = suggestConnectorPorts(left, right);

    expect(suggestion.fromPort).toBe("right");
    expect(suggestion.toPort).toBe("left");
    expect(suggestion.fromId).toBe(left.id);
    expect(suggestion.toId).toBe(right.id);
  });

  it("AC20: suggests left/right when target is to the left", () => {
    const right = makeObject({ id: uniqueId(1), x: 300, y: 0, width: 100, height: 100 });
    const left = makeObject({ id: uniqueId(2), x: 0, y: 0, width: 100, height: 100 });

    const suggestion = suggestConnectorPorts(right, left);

    expect(suggestion.fromPort).toBe("left");
    expect(suggestion.toPort).toBe("right");
  });

  it("AC21: suggests bottom/top for vertically adjacent objects", () => {
    const top = makeObject({ id: uniqueId(1), x: 0, y: 0, width: 100, height: 100 });
    const bottom = makeObject({ id: uniqueId(2), x: 0, y: 300, width: 100, height: 100 });

    const suggestion = suggestConnectorPorts(top, bottom);

    expect(suggestion.fromPort).toBe("bottom");
    expect(suggestion.toPort).toBe("top");
  });

  it("AC21: suggests top/bottom when target is above", () => {
    const bottom = makeObject({ id: uniqueId(1), x: 0, y: 300, width: 100, height: 100 });
    const top = makeObject({ id: uniqueId(2), x: 0, y: 0, width: 100, height: 100 });

    const suggestion = suggestConnectorPorts(bottom, top);

    expect(suggestion.fromPort).toBe("top");
    expect(suggestion.toPort).toBe("bottom");
  });

  it("AC22: diagonal — horizontal dominance chooses right/left", () => {
    const a = makeObject({ id: uniqueId(1), x: 0, y: 0, width: 100, height: 100 });
    const b = makeObject({ id: uniqueId(2), x: 400, y: 100, width: 100, height: 100 });

    const suggestion = suggestConnectorPorts(a, b);

    expect(suggestion.fromPort).toBe("right");
    expect(suggestion.toPort).toBe("left");
  });

  it("AC22: diagonal — vertical dominance chooses bottom/top", () => {
    const a = makeObject({ id: uniqueId(1), x: 0, y: 0, width: 100, height: 100 });
    const b = makeObject({ id: uniqueId(2), x: 100, y: 400, width: 100, height: 100 });

    const suggestion = suggestConnectorPorts(a, b);

    expect(suggestion.fromPort).toBe("bottom");
    expect(suggestion.toPort).toBe("top");
  });

  it("AC23: returns correct fromId and toId", () => {
    const a = makeObject({ id: uniqueId(1), x: 0, y: 0, width: 100, height: 100 });
    const b = makeObject({ id: uniqueId(2), x: 300, y: 0, width: 100, height: 100 });

    const suggestion = suggestConnectorPorts(a, b);

    expect(suggestion.fromId).toBe(a.id);
    expect(suggestion.toId).toBe(b.id);
  });

  it("AC23: returns valid PortName values", () => {
    const a = makeObject({ id: uniqueId(1), x: 0, y: 0, width: 100, height: 100 });
    const b = makeObject({ id: uniqueId(2), x: 300, y: 300, width: 100, height: 100 });

    const suggestion = suggestConnectorPorts(a, b);

    const validPorts = ["top", "right", "bottom", "left", "center"];
    expect(validPorts).toContain(suggestion.fromPort);
    expect(validPorts).toContain(suggestion.toPort);
  });

  it("handles overlapping objects (dx=0, dy=0) — horizontal tie breaks to right/left", () => {
    const a = makeObject({ id: uniqueId(1), x: 0, y: 0, width: 100, height: 100 });
    const b = makeObject({ id: uniqueId(2), x: 0, y: 0, width: 100, height: 100 });

    const suggestion = suggestConnectorPorts(a, b);

    // When dx === dy === 0, abs(dx) >= abs(dy) is true, dx >= 0 is true
    expect(suggestion.fromPort).toBe("right");
    expect(suggestion.toPort).toBe("left");
  });
});

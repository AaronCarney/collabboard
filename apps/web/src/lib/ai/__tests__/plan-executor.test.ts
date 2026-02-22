import { describe, it, expect, vi } from "vitest";
import type { BoardObject } from "@collabboard/shared";
import { executePlan } from "../plan-executor";
import type { Plan } from "../plan-schema";

// Mock uuid to return predictable IDs
let uuidCounter = 0;
vi.mock("uuid", () => ({
  v4: (): string => {
    uuidCounter++;
    return `00000000-0000-0000-0000-${String(uuidCounter).padStart(12, "0")}`;
  },
}));

// Mock collision resolution to pass-through (tests collision separately)
vi.mock("../collision", () => ({
  resolveOverlaps: vi.fn((newObjs: BoardObject[]) => newObjs),
}));

const BOARD_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "user-1";
const OBJ_ID_1 = "22222222-2222-2222-2222-222222222222";
const OBJ_ID_2 = "33333333-3333-3333-3333-333333333333";

function makeExistingObject(id: string, overrides?: Partial<BoardObject>): BoardObject {
  return {
    id,
    board_id: BOARD_ID,
    type: "sticky_note",
    x: 100,
    y: 100,
    width: 200,
    height: 200,
    rotation: 0,
    content: "Existing",
    color: "#FFEB3B",
    version: 1,
    created_by: USER_ID,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    parent_frame_id: null,
    properties: {},
    ...overrides,
  };
}

// Reset uuid counter before each test
import { beforeEach } from "vitest";
beforeEach(() => {
  uuidCounter = 0;
});

// ─── Object creation ──────────────────────────────────────────

describe("executePlan — object creation", () => {
  it("creates a sticky note with correct fields", () => {
    const plan: Plan = {
      objects: [{ type: "sticky_note", x: 100, y: 200, content: "Hello", color: "blue" }],
      message: "Created note",
    };
    const result = executePlan(plan, BOARD_ID, USER_ID, []);
    expect(result.objects).toHaveLength(1);
    const obj = result.objects[0];
    expect(obj.type).toBe("sticky_note");
    expect(obj.x).toBe(100);
    expect(obj.y).toBe(200);
    expect(obj.content).toBe("Hello");
    expect(obj.color).toBe("#90CAF9"); // blue resolved
    expect(obj.board_id).toBe(BOARD_ID);
    expect(obj.created_by).toBe(USER_ID);
    expect(obj.version).toBe(1);
    expect(obj.rotation).toBe(0);
    expect(obj.parent_frame_id).toBeNull();
  });

  it("creates a rectangle with specified dimensions", () => {
    const plan: Plan = {
      objects: [{ type: "rectangle", x: 50, y: 50, width: 400, height: 300 }],
      message: "Created rectangle",
    };
    const result = executePlan(plan, BOARD_ID, USER_ID, []);
    expect(result.objects).toHaveLength(1);
    expect(result.objects[0].type).toBe("rectangle");
    expect(result.objects[0].width).toBe(400);
    expect(result.objects[0].height).toBe(300);
  });

  it("creates a frame with default dimensions when not specified", () => {
    const plan: Plan = {
      objects: [{ type: "frame", x: 0, y: 0, content: "My Frame" }],
      message: "Created frame",
    };
    const result = executePlan(plan, BOARD_ID, USER_ID, []);
    expect(result.objects).toHaveLength(1);
    expect(result.objects[0].type).toBe("frame");
    expect(result.objects[0].width).toBe(400); // OBJECT_DEFAULTS.frame.width
    expect(result.objects[0].height).toBe(300);
    expect(result.objects[0].content).toBe("My Frame");
  });

  it("creates a connector with correct properties", () => {
    const plan: Plan = {
      objects: [
        {
          type: "connector",
          x: 0,
          y: 0,
          fromObjectId: OBJ_ID_1,
          toObjectId: OBJ_ID_2,
          connectorStyle: "dashed",
        },
      ],
      message: "Connected",
    };
    const result = executePlan(plan, BOARD_ID, USER_ID, []);
    expect(result.objects).toHaveLength(1);
    const connector = result.objects[0];
    expect(connector.type).toBe("connector");
    if (connector.type === "connector") {
      expect(connector.properties.from_object_id).toBe(OBJ_ID_1);
      expect(connector.properties.to_object_id).toBe(OBJ_ID_2);
      expect(connector.properties.stroke_style).toBe("dashed");
      expect(connector.properties.arrow_style).toBe("end");
    }
  });

  it("creates multiple objects from a single plan", () => {
    const plan: Plan = {
      objects: [
        { type: "sticky_note", x: 0, y: 0 },
        { type: "sticky_note", x: 300, y: 0 },
        { type: "sticky_note", x: 0, y: 300 },
      ],
      message: "Created 3 notes",
    };
    const result = executePlan(plan, BOARD_ID, USER_ID, []);
    expect(result.objects).toHaveLength(3);
    // Each should have a unique ID
    const ids = new Set(result.objects.map((o) => o.id));
    expect(ids.size).toBe(3);
  });

  it("sets parentFrameId when provided", () => {
    const frameId = "44444444-4444-4444-4444-444444444444";
    const plan: Plan = {
      objects: [{ type: "sticky_note", x: 10, y: 10, parentFrameId: frameId }],
      message: "Created child note",
    };
    const result = executePlan(plan, BOARD_ID, USER_ID, []);
    expect(result.objects[0].parent_frame_id).toBe(frameId);
  });
});

// ─── Modifications ────────────────────────────────────────────

describe("executePlan — modifications", () => {
  it("applies move modification", () => {
    const plan: Plan = {
      objects: [],
      modifications: [{ objectId: OBJ_ID_1, action: "move", x: 500, y: 600 }],
      message: "Moved",
    };
    const existing = [makeExistingObject(OBJ_ID_1)];
    const result = executePlan(plan, BOARD_ID, USER_ID, existing);
    expect(result.modifiedObjects).toHaveLength(1);
    expect(result.modifiedObjects[0].x).toBe(500);
    expect(result.modifiedObjects[0].y).toBe(600);
    expect(result.modifiedObjects[0].version).toBe(2);
  });

  it("applies resize modification", () => {
    const plan: Plan = {
      objects: [],
      modifications: [{ objectId: OBJ_ID_1, action: "resize", width: 400, height: 300 }],
      message: "Resized",
    };
    const existing = [makeExistingObject(OBJ_ID_1)];
    const result = executePlan(plan, BOARD_ID, USER_ID, existing);
    expect(result.modifiedObjects).toHaveLength(1);
    expect(result.modifiedObjects[0].width).toBe(400);
    expect(result.modifiedObjects[0].height).toBe(300);
  });

  it("applies recolor modification using color name", () => {
    const plan: Plan = {
      objects: [],
      modifications: [{ objectId: OBJ_ID_1, action: "recolor", color: "blue" }],
      message: "Recolored",
    };
    const existing = [makeExistingObject(OBJ_ID_1)];
    const result = executePlan(plan, BOARD_ID, USER_ID, existing);
    expect(result.modifiedObjects).toHaveLength(1);
    expect(result.modifiedObjects[0].color).toBe("#90CAF9");
  });

  it("applies update_text modification", () => {
    const plan: Plan = {
      objects: [],
      modifications: [{ objectId: OBJ_ID_1, action: "update_text", text: "New text" }],
      message: "Updated text",
    };
    const existing = [makeExistingObject(OBJ_ID_1)];
    const result = executePlan(plan, BOARD_ID, USER_ID, existing);
    expect(result.modifiedObjects).toHaveLength(1);
    expect(result.modifiedObjects[0].content).toBe("New text");
  });

  it("applies delete modification", () => {
    const plan: Plan = {
      objects: [],
      modifications: [{ objectId: OBJ_ID_1, action: "delete" }],
      message: "Deleted",
    };
    const existing = [makeExistingObject(OBJ_ID_1)];
    const result = executePlan(plan, BOARD_ID, USER_ID, existing);
    expect(result.deletedIds).toContain(OBJ_ID_1);
    expect(result.modifiedObjects).toHaveLength(0);
  });

  it("skips modification for non-existent object", () => {
    const plan: Plan = {
      objects: [],
      modifications: [{ objectId: "nonexistent-id-not-uuid", action: "move", x: 0, y: 0 }],
      message: "Skipped",
    };
    const result = executePlan(plan, BOARD_ID, USER_ID, []);
    expect(result.modifiedObjects).toHaveLength(0);
    expect(result.deletedIds).toHaveLength(0);
  });
});

// ─── Mixed plan ───────────────────────────────────────────────

describe("executePlan — mixed create and modify", () => {
  it("handles plan with both new objects and modifications", () => {
    const plan: Plan = {
      objects: [{ type: "sticky_note", x: 300, y: 300, content: "New" }],
      modifications: [
        { objectId: OBJ_ID_1, action: "move", x: 0, y: 0 },
        { objectId: OBJ_ID_2, action: "delete" },
      ],
      message: "Mixed plan",
    };
    const existing = [makeExistingObject(OBJ_ID_1), makeExistingObject(OBJ_ID_2)];
    const result = executePlan(plan, BOARD_ID, USER_ID, existing);
    expect(result.objects).toHaveLength(1);
    expect(result.modifiedObjects).toHaveLength(1);
    expect(result.deletedIds).toContain(OBJ_ID_2);
  });

  it("returns empty arrays for plan with no objects or modifications", () => {
    const plan: Plan = {
      objects: [],
      message: "Empty plan",
    };
    const result = executePlan(plan, BOARD_ID, USER_ID, []);
    expect(result.objects).toHaveLength(0);
    expect(result.deletedIds).toHaveLength(0);
    expect(result.modifiedObjects).toHaveLength(0);
  });
});

// ─── Collision resolution ─────────────────────────────────────

describe("executePlan — collision resolution", () => {
  it("calls resolveOverlaps on new objects", async () => {
    const { resolveOverlaps } = vi.mocked(await import("../collision"));

    const plan: Plan = {
      objects: [
        { type: "sticky_note", x: 0, y: 0 },
        { type: "sticky_note", x: 10, y: 10 },
      ],
      message: "Overlapping",
    };
    const existing = [makeExistingObject(OBJ_ID_1)];
    executePlan(plan, BOARD_ID, USER_ID, existing);
    expect(resolveOverlaps).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ type: "sticky_note" }),
        expect.objectContaining({ type: "sticky_note" }),
      ]),
      existing
    );
  });
});

// ─── Synchronous execution ────────────────────────────────────

describe("executePlan — is synchronous", () => {
  it("returns a PlanExecutionResult directly (not a Promise)", () => {
    const plan: Plan = {
      objects: [{ type: "sticky_note", x: 0, y: 0 }],
      message: "Sync test",
    };
    const result = executePlan(plan, BOARD_ID, USER_ID, []);
    // If executePlan returned a Promise, result would be a Promise (thenable)
    expect(result).not.toHaveProperty("then");
    expect(result.objects).toHaveLength(1);
  });
});

// ─── Connector styles ─────────────────────────────────────────

describe("executePlan — connector styles", () => {
  it("creates arrow connector by default", () => {
    const plan: Plan = {
      objects: [{ type: "connector", x: 0, y: 0, fromObjectId: OBJ_ID_1, toObjectId: OBJ_ID_2 }],
      message: "Arrow connector",
    };
    const result = executePlan(plan, BOARD_ID, USER_ID, []);
    const c = result.objects[0];
    if (c.type === "connector") {
      expect(c.properties.arrow_style).toBe("end");
      expect(c.properties.stroke_style).toBe("solid");
    }
  });

  it("creates line connector with no arrows", () => {
    const plan: Plan = {
      objects: [
        {
          type: "connector",
          x: 0,
          y: 0,
          fromObjectId: OBJ_ID_1,
          toObjectId: OBJ_ID_2,
          connectorStyle: "line",
        },
      ],
      message: "Line connector",
    };
    const result = executePlan(plan, BOARD_ID, USER_ID, []);
    const c = result.objects[0];
    if (c.type === "connector") {
      expect(c.properties.arrow_style).toBe("none");
      expect(c.properties.stroke_style).toBe("solid");
    }
  });
});

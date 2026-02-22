import { describe, it, expect } from "vitest";
import type { BoardObject } from "@collabboard/shared";
import { validatePlan } from "../plan-validator";
import type { Plan } from "../plan-schema";

const BOARD_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "user-1";
const OBJ_ID_1 = "22222222-2222-2222-2222-222222222222";
const OBJ_ID_2 = "33333333-3333-3333-3333-333333333333";

function makeExistingObject(id: string): BoardObject {
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
  };
}

// ─── Basic validation ─────────────────────────────────────────

describe("validatePlan", () => {
  it("returns valid for a plan with valid create objects", () => {
    const plan: Plan = {
      objects: [{ type: "sticky_note", x: 100, y: 100, content: "Hello" }],
      message: "Created a note",
    };
    const result = validatePlan(plan, []);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns valid for an empty plan", () => {
    const plan: Plan = {
      objects: [],
      message: "Nothing to do",
    };
    const result = validatePlan(plan, []);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // ─── Position clamping ────────────────────────────────────

  it("clamps out-of-range x/y positions in new objects", () => {
    const plan: Plan = {
      objects: [{ type: "sticky_note", x: -999999, y: 999999 }],
      message: "Clamped",
    };
    const result = validatePlan(plan, []);
    expect(result.valid).toBe(true);
    expect(result.corrected.objects[0].x).toBe(-50000);
    expect(result.corrected.objects[0].y).toBe(50000);
  });

  // ─── Dimension clamping ───────────────────────────────────

  it("clamps out-of-range width/height in new objects", () => {
    const plan: Plan = {
      objects: [{ type: "rectangle", x: 0, y: 0, width: 99999, height: 1 }],
      message: "Clamped dimensions",
    };
    const result = validatePlan(plan, []);
    expect(result.valid).toBe(true);
    expect(result.corrected.objects[0].width).toBe(5000);
    expect(result.corrected.objects[0].height).toBe(10);
  });

  // ─── Modification validation ──────────────────────────────

  it("validates move modification against existing objects", () => {
    const plan: Plan = {
      objects: [],
      modifications: [{ objectId: OBJ_ID_1, action: "move", x: 300, y: 400 }],
      message: "Moved object",
    };
    const result = validatePlan(plan, [makeExistingObject(OBJ_ID_1)]);
    expect(result.valid).toBe(true);
    expect(result.corrected.modifications).toHaveLength(1);
  });

  it("rejects modification targeting non-existent object", () => {
    const plan: Plan = {
      objects: [],
      modifications: [{ objectId: OBJ_ID_1, action: "move", x: 100, y: 100 }],
      message: "Should fail",
    };
    const result = validatePlan(plan, []);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("not found");
  });

  it("filters out invalid modifications from corrected plan", () => {
    const plan: Plan = {
      objects: [],
      modifications: [
        { objectId: OBJ_ID_1, action: "move", x: 100, y: 100 },
        { objectId: OBJ_ID_2, action: "recolor", color: "blue" },
      ],
      message: "Mixed",
    };
    // Only OBJ_ID_1 exists
    const result = validatePlan(plan, [makeExistingObject(OBJ_ID_1)]);
    expect(result.corrected.modifications).toHaveLength(1);
    const firstMod = result.corrected.modifications?.[0];
    expect(firstMod?.objectId).toBe(OBJ_ID_1);
  });

  // ─── Connector validation ────────────────────────────────

  it("marks invalid when connector references non-existent fromObjectId", () => {
    const plan: Plan = {
      objects: [
        {
          type: "connector",
          x: 0,
          y: 0,
          fromObjectId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          toObjectId: OBJ_ID_1,
        },
      ],
      message: "Bad connector",
    };
    const result = validatePlan(plan, [makeExistingObject(OBJ_ID_1)]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("fromObjectId"))).toBe(true);
  });

  it("marks invalid when connector references non-existent toObjectId", () => {
    const plan: Plan = {
      objects: [
        {
          type: "connector",
          x: 0,
          y: 0,
          fromObjectId: OBJ_ID_1,
          toObjectId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        },
      ],
      message: "Bad connector",
    };
    const result = validatePlan(plan, [makeExistingObject(OBJ_ID_1)]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("toObjectId"))).toBe(true);
  });

  it("accepts connector with valid references", () => {
    const plan: Plan = {
      objects: [
        {
          type: "connector",
          x: 0,
          y: 0,
          fromObjectId: OBJ_ID_1,
          toObjectId: OBJ_ID_2,
        },
      ],
      message: "Valid connector",
    };
    const result = validatePlan(plan, [makeExistingObject(OBJ_ID_1), makeExistingObject(OBJ_ID_2)]);
    expect(result.valid).toBe(true);
  });

  // ─── Parent frame validation ──────────────────────────────

  it("clears invalid parentFrameId and records error", () => {
    const plan: Plan = {
      objects: [
        {
          type: "sticky_note",
          x: 100,
          y: 100,
          parentFrameId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        },
      ],
      message: "Invalid parent",
    };
    const result = validatePlan(plan, []);
    // parentFrameId errors are non-hard (corrected to null)
    expect(result.valid).toBe(true);
    expect(result.corrected.objects[0].parentFrameId).toBeNull();
    expect(result.errors.some((e) => e.includes("parentFrameId"))).toBe(true);
  });

  // ─── Modification position clamping ───────────────────────

  it("clamps move modification positions", () => {
    const plan: Plan = {
      objects: [],
      modifications: [{ objectId: OBJ_ID_1, action: "move", x: -999999, y: 999999 }],
      message: "Clamped move",
    };
    const result = validatePlan(plan, [makeExistingObject(OBJ_ID_1)]);
    expect(result.valid).toBe(true);
    const mod = result.corrected.modifications?.[0];
    expect(mod?.x).toBe(-50000);
    expect(mod?.y).toBe(50000);
  });

  it("clamps resize modification dimensions", () => {
    const plan: Plan = {
      objects: [],
      modifications: [{ objectId: OBJ_ID_1, action: "resize", width: 99999, height: 1 }],
      message: "Clamped resize",
    };
    const result = validatePlan(plan, [makeExistingObject(OBJ_ID_1)]);
    expect(result.valid).toBe(true);
    const mod = result.corrected.modifications?.[0];
    expect(mod?.width).toBe(5000);
    expect(mod?.height).toBe(10);
  });

  // ─── Corrected plan preserves message ─────────────────────

  it("preserves the original message in corrected plan", () => {
    const plan: Plan = {
      objects: [{ type: "sticky_note", x: 0, y: 0 }],
      message: "My message",
    };
    const result = validatePlan(plan, []);
    expect(result.corrected.message).toBe("My message");
  });

  // ─── Delete modification ──────────────────────────────────

  it("accepts delete modification for existing object", () => {
    const plan: Plan = {
      objects: [],
      modifications: [{ objectId: OBJ_ID_1, action: "delete" }],
      message: "Deleted object",
    };
    const result = validatePlan(plan, [makeExistingObject(OBJ_ID_1)]);
    expect(result.valid).toBe(true);
    expect(result.corrected.modifications).toHaveLength(1);
  });
});

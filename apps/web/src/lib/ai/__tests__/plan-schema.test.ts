import { describe, it, expect } from "vitest";
import { PlanSchema, PlanObjectSchema, ModificationSchema } from "../plan-schema";
import type { Plan, PlanObject, Modification } from "../plan-schema";

/** Default nullable fields for PlanObject — keeps test data concise. */
const OBJ_DEFAULTS = {
  width: null,
  height: null,
  content: null,
  color: null,
  parentFrameId: null,
  fromObjectId: null,
  toObjectId: null,
  connectorStyle: null,
} as const;

/** Default nullable fields for Modification. */
const MOD_DEFAULTS = {
  x: null,
  y: null,
  width: null,
  height: null,
  color: null,
  text: null,
} as const;

// ─── PlanObjectSchema ─────────────────────────────────────────

describe("PlanObjectSchema", () => {
  it("accepts a minimal sticky_note object", () => {
    const input: PlanObject = {
      type: "sticky_note",
      x: 100,
      y: 200,
      ...OBJ_DEFAULTS,
    };
    const result = PlanObjectSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("accepts a fully specified object", () => {
    const input: PlanObject = {
      type: "rectangle",
      x: 50,
      y: 50,
      width: 300,
      height: 200,
      content: "Hello",
      color: "#FF0000",
      parentFrameId: "11111111-1111-1111-1111-111111111111",
      fromObjectId: null,
      toObjectId: null,
      connectorStyle: null,
    };
    const result = PlanObjectSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("accepts connector with connector-specific fields", () => {
    const input: PlanObject = {
      type: "connector",
      x: 0,
      y: 0,
      ...OBJ_DEFAULTS,
      fromObjectId: "11111111-1111-1111-1111-111111111111",
      toObjectId: "22222222-2222-2222-2222-222222222222",
      connectorStyle: "arrow",
    };
    const result = PlanObjectSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects an object with missing required fields", () => {
    const result = PlanObjectSchema.safeParse({ type: "sticky_note" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid type", () => {
    const result = PlanObjectSchema.safeParse({
      type: "unknown_type",
      x: 0,
      y: 0,
      ...OBJ_DEFAULTS,
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid object types", () => {
    const types = ["sticky_note", "rectangle", "circle", "text", "frame", "connector"] as const;
    for (const type of types) {
      const result = PlanObjectSchema.safeParse({ type, x: 0, y: 0, ...OBJ_DEFAULTS });
      expect(result.success).toBe(true);
    }
  });
});

// ─── ModificationSchema ───────────────────────────────────────

describe("ModificationSchema", () => {
  it("accepts a move modification", () => {
    const input: Modification = {
      objectId: "11111111-1111-1111-1111-111111111111",
      action: "move",
      ...MOD_DEFAULTS,
      x: 300,
      y: 400,
    };
    const result = ModificationSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("accepts a resize modification", () => {
    const input: Modification = {
      objectId: "11111111-1111-1111-1111-111111111111",
      action: "resize",
      ...MOD_DEFAULTS,
      width: 500,
      height: 300,
    };
    const result = ModificationSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("accepts a recolor modification", () => {
    const input: Modification = {
      objectId: "11111111-1111-1111-1111-111111111111",
      action: "recolor",
      ...MOD_DEFAULTS,
      color: "blue",
    };
    const result = ModificationSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("accepts an update_text modification", () => {
    const input: Modification = {
      objectId: "11111111-1111-1111-1111-111111111111",
      action: "update_text",
      ...MOD_DEFAULTS,
      text: "New content",
    };
    const result = ModificationSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("accepts a delete modification", () => {
    const input: Modification = {
      objectId: "11111111-1111-1111-1111-111111111111",
      action: "delete",
      ...MOD_DEFAULTS,
    };
    const result = ModificationSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects modification with invalid action", () => {
    const result = ModificationSchema.safeParse({
      objectId: "11111111-1111-1111-1111-111111111111",
      action: "fly_away",
      ...MOD_DEFAULTS,
    });
    expect(result.success).toBe(false);
  });

  it("rejects modification with invalid UUID", () => {
    const result = ModificationSchema.safeParse({
      objectId: "not-a-uuid",
      action: "move",
      ...MOD_DEFAULTS,
      x: 100,
      y: 100,
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid action types", () => {
    const actions = ["move", "resize", "recolor", "update_text", "delete"] as const;
    for (const action of actions) {
      const result = ModificationSchema.safeParse({
        objectId: "11111111-1111-1111-1111-111111111111",
        action,
        ...MOD_DEFAULTS,
      });
      expect(result.success).toBe(true);
    }
  });
});

// ─── PlanSchema ───────────────────────────────────────────────

describe("PlanSchema", () => {
  it("accepts a plan with objects only", () => {
    const plan: Plan = {
      objects: [{ type: "sticky_note", x: 100, y: 100, ...OBJ_DEFAULTS, content: "Hello" }],
      modifications: null,
      message: "Created a sticky note",
    };
    const result = PlanSchema.safeParse(plan);
    expect(result.success).toBe(true);
  });

  it("accepts a plan with objects and modifications", () => {
    const plan: Plan = {
      objects: [],
      modifications: [
        {
          objectId: "11111111-1111-1111-1111-111111111111",
          action: "move",
          ...MOD_DEFAULTS,
          x: 200,
          y: 300,
        },
      ],
      message: "Moved the object",
    };
    const result = PlanSchema.safeParse(plan);
    expect(result.success).toBe(true);
  });

  it("accepts a plan with null modifications", () => {
    const plan: Plan = {
      objects: [],
      modifications: null,
      message: "Nothing to do",
    };
    const result = PlanSchema.safeParse(plan);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.modifications).toBeNull();
    }
  });

  it("rejects a plan without message", () => {
    const result = PlanSchema.safeParse({
      objects: [],
      modifications: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a plan without objects array", () => {
    const result = PlanSchema.safeParse({
      modifications: null,
      message: "No objects field",
    });
    expect(result.success).toBe(false);
  });

  it("modifications field is nullable", () => {
    const plan: Plan = {
      objects: [{ type: "sticky_note", x: 0, y: 0, ...OBJ_DEFAULTS }],
      modifications: null,
      message: "Created one note",
    };
    const result = PlanSchema.safeParse(plan);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.modifications).toBeNull();
    }
  });

  it("accepts a complex multi-object plan", () => {
    const plan: Plan = {
      objects: [
        { type: "frame", x: 0, y: 0, ...OBJ_DEFAULTS, width: 800, height: 600, content: "SWOT" },
        {
          type: "sticky_note",
          x: 10,
          y: 10,
          ...OBJ_DEFAULTS,
          content: "Strengths",
          color: "green",
        },
        {
          type: "sticky_note",
          x: 210,
          y: 10,
          ...OBJ_DEFAULTS,
          content: "Weaknesses",
          color: "red",
        },
        {
          type: "sticky_note",
          x: 10,
          y: 210,
          ...OBJ_DEFAULTS,
          content: "Opportunities",
          color: "blue",
        },
        {
          type: "sticky_note",
          x: 210,
          y: 210,
          ...OBJ_DEFAULTS,
          content: "Threats",
          color: "orange",
        },
      ],
      modifications: [],
      message: "Created a SWOT analysis",
    };
    const result = PlanSchema.safeParse(plan);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.objects).toHaveLength(5);
    }
  });
});

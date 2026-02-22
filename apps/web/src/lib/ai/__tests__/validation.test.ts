import { describe, it, expect } from "vitest";
import { validateToolCallArgs } from "../validation";
import type { BoardObject } from "@collabboard/shared";

const BOARD_ID = "11111111-1111-1111-1111-111111111111";
const EXISTING_ID = "22222222-2222-2222-2222-222222222222";
const USER_ID = "user-1";

function makeExistingObjects(): BoardObject[] {
  return [
    {
      id: EXISTING_ID,
      board_id: BOARD_ID,
      type: "sticky_note",
      x: 100,
      y: 100,
      width: 200,
      height: 200,
      rotation: 0,
      content: "Existing note",
      color: "#FFEB3B",
      version: 1,
      created_by: USER_ID,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      parent_frame_id: null,
      properties: {},
    },
  ];
}

describe("validateToolCallArgs — dimension clamping", () => {
  it("clamps width 99999 to 5000", () => {
    const result = validateToolCallArgs(
      "createShape",
      { type: "rectangle", x: 0, y: 0, width: 99999, height: 200 },
      []
    );
    expect(result.valid).toBe(true);
    expect(result.clamped).toContain("width");
  });

  it("clamps width 1 to 10", () => {
    const result = validateToolCallArgs(
      "createShape",
      { type: "rectangle", x: 0, y: 0, width: 1, height: 200 },
      []
    );
    expect(result.valid).toBe(true);
    expect(result.clamped).toContain("width");
  });

  it("clamps height -5 to 10", () => {
    const result = validateToolCallArgs(
      "createShape",
      { type: "rectangle", x: 0, y: 0, width: 200, height: -5 },
      []
    );
    expect(result.valid).toBe(true);
    expect(result.clamped).toContain("height");
  });

  it("does not clamp dimensions within valid range", () => {
    const result = validateToolCallArgs(
      "createShape",
      { type: "rectangle", x: 0, y: 0, width: 200, height: 300 },
      []
    );
    expect(result.valid).toBe(true);
    expect(result.clamped).toEqual([]);
  });
});

describe("validateToolCallArgs — position clamping", () => {
  it("clamps x -100000 to -50000", () => {
    const result = validateToolCallArgs("createStickyNote", { text: "Note", x: -100000, y: 0 }, []);
    expect(result.valid).toBe(true);
    expect(result.clamped).toContain("x");
  });

  it("clamps y 100000 to 50000", () => {
    const result = validateToolCallArgs("createStickyNote", { text: "Note", x: 0, y: 100000 }, []);
    expect(result.valid).toBe(true);
    expect(result.clamped).toContain("y");
  });

  it("does not clamp positions within valid range", () => {
    const result = validateToolCallArgs("createStickyNote", { text: "Note", x: 500, y: -500 }, []);
    expect(result.valid).toBe(true);
    expect(result.clamped).toEqual([]);
  });
});

describe("validateToolCallArgs — type coercion", () => {
  it("coerces string '100' to number 100 for x", () => {
    const result = validateToolCallArgs("createStickyNote", { text: "Note", x: "100", y: 0 }, []);
    expect(result.valid).toBe(true);
    expect(result.clamped).toContain("x");
  });

  it("does not coerce non-numeric string 'abc'", () => {
    const result = validateToolCallArgs("createStickyNote", { text: "Note", x: "abc", y: 0 }, []);
    // "abc" cannot be coerced, so it should not appear in clamped
    expect(result.clamped).not.toContain("x");
  });
});

describe("validateToolCallArgs — objectId validation", () => {
  it("returns valid: false when objectId does not exist", () => {
    const result = validateToolCallArgs(
      "moveObject",
      { objectId: "99999999-9999-9999-9999-999999999999", x: 0, y: 0 },
      makeExistingObjects()
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("returns valid: true when objectId matches an existing object", () => {
    const result = validateToolCallArgs(
      "moveObject",
      { objectId: EXISTING_ID, x: 200, y: 300 },
      makeExistingObjects()
    );
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns valid: true when args have no objectId field", () => {
    const result = validateToolCallArgs(
      "createStickyNote",
      { text: "New note", x: 0, y: 0 },
      makeExistingObjects()
    );
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("does not validate fromId or toId fields (handled by executor)", () => {
    const result = validateToolCallArgs(
      "createConnector",
      { fromId: "nonexistent", toId: "also-nonexistent" },
      []
    );
    expect(result.valid).toBe(true); // validation layer only checks objectId
  });

  it("returns valid: false when objectId is a string but existingObjects is empty", () => {
    const result = validateToolCallArgs(
      "moveObject",
      { objectId: "99999999-9999-9999-9999-999999999999", x: 0, y: 0 },
      []
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("skips objectId check when objectId is a number (non-string)", () => {
    const result = validateToolCallArgs(
      "moveObject",
      { objectId: 12345 as unknown as string, x: 0, y: 0 },
      []
    );
    // Non-string objectId bypasses the lookup guard — validation passes
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("skips objectId check when objectId is null", () => {
    const result = validateToolCallArgs(
      "moveObject",
      { objectId: null as unknown as string, x: 0, y: 0 },
      []
    );
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe("validateToolCallArgs — non-numeric field types", () => {
  it("ignores a null value for width and does not clamp", () => {
    const args: Record<string, unknown> = { width: null, height: 200 };
    const result = validateToolCallArgs("createShape", args, []);
    expect(result.valid).toBe(true);
    expect(result.clamped).not.toContain("width");
    // The null value is left unchanged (field returned early)
    expect(args.width).toBeNull();
  });

  it("ignores a boolean value for height and does not clamp", () => {
    const args: Record<string, unknown> = { width: 200, height: true };
    const result = validateToolCallArgs("createShape", args, []);
    expect(result.valid).toBe(true);
    expect(result.clamped).not.toContain("height");
    expect(args.height).toBe(true);
  });

  it("ignores an object value for x and does not clamp", () => {
    const args: Record<string, unknown> = { x: { value: 100 }, y: 0 };
    const result = validateToolCallArgs("createStickyNote", args, []);
    expect(result.valid).toBe(true);
    expect(result.clamped).not.toContain("x");
  });
});

describe("validateToolCallArgs — NaN and Infinity", () => {
  it("does not clamp NaN for width (Number.isFinite guard rejects it)", () => {
    const args: Record<string, unknown> = { width: NaN, height: 200 };
    const result = validateToolCallArgs("createShape", args, []);
    expect(result.valid).toBe(true);
    expect(result.clamped).not.toContain("width");
    expect(args.width).toBeNaN();
  });

  it("does not clamp Infinity for height", () => {
    const args: Record<string, unknown> = { width: 200, height: Infinity };
    const result = validateToolCallArgs("createShape", args, []);
    expect(result.valid).toBe(true);
    expect(result.clamped).not.toContain("height");
    expect(args.height).toBe(Infinity);
  });

  it("does not coerce string 'Infinity' for x (not a finite number)", () => {
    const args: Record<string, unknown> = { x: "Infinity", y: 0 };
    const result = validateToolCallArgs("createStickyNote", args, []);
    expect(result.valid).toBe(true);
    expect(result.clamped).not.toContain("x");
  });

  it("does not coerce string 'NaN' for y", () => {
    const args: Record<string, unknown> = { x: 0, y: "NaN" };
    const result = validateToolCallArgs("createStickyNote", args, []);
    expect(result.valid).toBe(true);
    expect(result.clamped).not.toContain("y");
  });
});

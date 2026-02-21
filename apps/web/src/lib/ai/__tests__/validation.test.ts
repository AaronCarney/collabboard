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

  it("does not validate from_id or to_id fields (handled by executor)", () => {
    const result = validateToolCallArgs(
      "create_connector",
      { from_id: "nonexistent", to_id: "also-nonexistent" },
      []
    );
    expect(result.valid).toBe(true); // validation layer only checks objectId
  });
});

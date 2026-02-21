import { describe, it, expect } from "vitest";
import { AI_COLOR_PALETTE, AI_COLOR_NAMES, resolveColor } from "../colors";

describe("AI_COLOR_PALETTE", () => {
  it("contains all 12 expected color keys", () => {
    const expectedKeys = [
      "yellow",
      "blue",
      "green",
      "pink",
      "orange",
      "purple",
      "red",
      "teal",
      "lime",
      "gray",
      "white",
      "lightblue",
    ];
    for (const key of expectedKeys) {
      expect(AI_COLOR_PALETTE).toHaveProperty(key);
    }
  });

  it("maps every key to a hex string starting with #", () => {
    for (const key of Object.keys(AI_COLOR_PALETTE)) {
      const value = AI_COLOR_PALETTE[key as keyof typeof AI_COLOR_PALETTE];
      expect(value).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe("AI_COLOR_NAMES", () => {
  it("has exactly 12 entries", () => {
    expect(AI_COLOR_NAMES).toHaveLength(12);
  });

  it("contains all expected color names", () => {
    const expected = [
      "yellow",
      "blue",
      "green",
      "pink",
      "orange",
      "purple",
      "red",
      "teal",
      "lime",
      "gray",
      "white",
      "lightblue",
    ];
    for (const name of expected) {
      expect(AI_COLOR_NAMES).toContain(name);
    }
  });
});

describe("resolveColor", () => {
  it("returns #90CAF9 for blue sticky_note", () => {
    expect(resolveColor("blue", "sticky_note")).toBe("#90CAF9");
  });

  it("returns #EF5350 for red shape", () => {
    expect(resolveColor("red", "shape")).toBe("#EF5350");
  });

  it("returns #FFEB3B for yellow sticky_note", () => {
    expect(resolveColor("yellow", "sticky_note")).toBe("#FFEB3B");
  });

  it("returns correct hex for each of the 12 named colors", () => {
    for (const name of AI_COLOR_NAMES) {
      const result = resolveColor(name, "sticky_note");
      expect(result).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("falls back to #FFEB3B for invalid name with sticky_note type", () => {
    expect(resolveColor("nonexistent", "sticky_note")).toBe("#FFEB3B");
  });

  it("falls back to #81D4FA for invalid name with shape type", () => {
    expect(resolveColor("nonexistent", "shape")).toBe("#81D4FA");
  });

  it("falls back to #E0E0E0 for invalid name with frame type", () => {
    expect(resolveColor("nonexistent", "frame")).toBe("#E0E0E0");
  });

  it("falls back to type default when name is undefined", () => {
    expect(resolveColor(undefined as unknown as string, "sticky_note")).toBe("#FFEB3B");
  });

  it("falls back to type default when name is empty string", () => {
    expect(resolveColor("", "sticky_note")).toBe("#FFEB3B");
  });

  it("passes through a valid raw hex string unchanged", () => {
    expect(resolveColor("#FF0000", "sticky_note")).toBe("#FF0000");
  });

  it("rejects an invalid 5-digit hex and falls back to type default", () => {
    expect(resolveColor("#FFFFF", "sticky_note")).toBe("#FFEB3B");
  });

  it("falls back to FALLBACK_COLOR (#FFEB3B) for unknown objectType with no palette match", () => {
    expect(resolveColor(undefined as unknown as string, "connector")).toBe("#FFEB3B");
  });

  it("falls back to FALLBACK_COLOR (#FFEB3B) for 'line' objectType with invalid color name", () => {
    expect(resolveColor("nonexistent", "line")).toBe("#FFEB3B");
  });

  it("falls back to FALLBACK_COLOR (#FFEB3B) for an empty objectType string", () => {
    expect(resolveColor(undefined as unknown as string, "")).toBe("#FFEB3B");
  });

  it("passes through a valid 3-digit hex string unchanged", () => {
    expect(resolveColor("#F00", "sticky_note")).toBe("#F00");
  });

  it("passes through a valid 8-digit hex string unchanged", () => {
    expect(resolveColor("#FF0000FF", "sticky_note")).toBe("#FF0000FF");
  });
});

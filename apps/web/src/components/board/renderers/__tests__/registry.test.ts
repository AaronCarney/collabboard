import { describe, it, expect } from "vitest";
import { getRenderer, hasRenderer } from "../renderer-registry";

// Import renderers to trigger registration
import "../init";

describe("renderer-registry", () => {
  it("returns the sticky_note renderer", () => {
    expect(hasRenderer("sticky_note")).toBe(true);
    const r = getRenderer("sticky_note");
    expect(r).toBeDefined();
    expect(typeof r.draw).toBe("function");
    expect(typeof r.hitTest).toBe("function");
    expect(typeof r.getBounds).toBe("function");
    expect(typeof r.getResizeHandles).toBe("function");
  });

  it("returns the rectangle renderer", () => {
    expect(hasRenderer("rectangle")).toBe(true);
    const r = getRenderer("rectangle");
    expect(r).toBeDefined();
  });

  it("returns the circle renderer", () => {
    expect(hasRenderer("circle")).toBe(true);
    const r = getRenderer("circle");
    expect(r).toBeDefined();
  });

  it("returns the text renderer", () => {
    expect(hasRenderer("text")).toBe(true);
    const r = getRenderer("text");
    expect(r).toBeDefined();
  });

  it("throws for unknown type", () => {
    expect(() => getRenderer("nonexistent")).toThrow(
      "No renderer registered for type: nonexistent"
    );
  });

  it("hasRenderer returns false for unknown type", () => {
    expect(hasRenderer("nonexistent")).toBe(false);
  });
});

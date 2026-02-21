import { describe, it, expect } from "vitest";
import type { BoardObject, StickyNoteObject } from "@collabboard/shared";
import { buildSystemPrompt } from "../system-prompt";

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
    x: overrides.x ?? 100,
    y: overrides.y ?? 100,
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

// Enhanced buildSystemPrompt takes (objects, viewport, selectedIds?)
const DEFAULT_VIEWPORT = { x: 0, y: 0, width: 800, height: 600 };

// ─── buildSystemPrompt (enhanced version) ────────────────────

describe("buildSystemPrompt (enhanced)", () => {
  it("contains a Role section", () => {
    const prompt = buildSystemPrompt([], DEFAULT_VIEWPORT);
    expect(prompt).toContain("Role");
  });

  it("contains a Coordinate System section mentioning top-left origin", () => {
    const prompt = buildSystemPrompt([], DEFAULT_VIEWPORT);
    // Must mention coordinate system with origin at top-left
    expect(prompt.toLowerCase()).toContain("coordinate system");
    expect(prompt.toLowerCase()).toContain("top-left");
    expect(prompt.toLowerCase()).toContain("origin");
  });

  it("contains a Color Palette section", () => {
    const prompt = buildSystemPrompt([], DEFAULT_VIEWPORT);
    expect(prompt).toContain("Color Palette");
  });

  it("contains a Rules section with tool-only output instruction", () => {
    const prompt = buildSystemPrompt([], DEFAULT_VIEWPORT);
    expect(prompt).toContain("Rules");
    // The enhanced prompt must appear alongside the other required sections
    // (Role, Coordinate System, Color Palette, Out of Scope) which don't exist yet
    expect(prompt).toContain("## Role");
    expect(prompt).toContain("## Rules");
  });

  it("contains an Out of Scope section", () => {
    const prompt = buildSystemPrompt([], DEFAULT_VIEWPORT);
    expect(prompt).toContain("Out of Scope");
  });

  it("contains a Board State section using 3-tier serialized context", () => {
    const obj = makeBoardObject({
      id: "33333333-3333-3333-3333-333333333333",
      x: 400,
      y: 300,
      content: "Visible object",
    });
    const prompt = buildSystemPrompt([obj], DEFAULT_VIEWPORT);
    expect(prompt).toContain("Board State");
    // The enhanced version uses serializeBoardState which classifies objects
    // into selected/viewport/nearby/summary tiers, not a flat list
    expect(prompt).toContain("Viewport");
  });

  it("includes Current Selection section when selectedIds match objects", () => {
    const obj = makeBoardObject({
      id: "22222222-2222-2222-2222-222222222222",
      content: "I am selected",
    });

    const prompt = buildSystemPrompt([obj], DEFAULT_VIEWPORT, [
      "22222222-2222-2222-2222-222222222222",
    ]);

    expect(prompt).toContain("Current Selection");
    expect(prompt).toContain("I am selected");
  });

  it("does not include Current Selection section when no objects are selected", () => {
    const obj = makeBoardObject({
      id: "22222222-2222-2222-2222-222222222222",
    });

    // Pass empty selectedIds array explicitly (new 3-arg signature)
    const prompt = buildSystemPrompt([obj], DEFAULT_VIEWPORT, []);

    expect(prompt).not.toContain("Current Selection");
    // Verify the enhanced prompt still has the required sections even without selection
    expect(prompt).toContain("Color Palette");
    expect(prompt).toContain("Out of Scope");
  });

  it("includes semantic color guidance for red, green, yellow, and blue", () => {
    const prompt = buildSystemPrompt([], DEFAULT_VIEWPORT);
    const lower = prompt.toLowerCase();
    // Semantic meanings: red=urgent, green=positive, yellow=ideas, blue=info
    expect(lower).toContain("red");
    expect(lower).toContain("urgent");
    expect(lower).toContain("green");
    expect(lower).toContain("positive");
    expect(lower).toContain("yellow");
    expect(lower).toContain("idea");
    expect(lower).toContain("blue");
    expect(lower).toContain("info");
  });

  it("includes the Coordinate System with X-right, Y-down directions", () => {
    const prompt = buildSystemPrompt([], DEFAULT_VIEWPORT);
    // The spec says: "origin top-left, X right, Y down"
    const lower = prompt.toLowerCase();
    expect(lower).toMatch(/x.*right/);
    expect(lower).toMatch(/y.*down/);
  });

  it("includes viewport center coordinates in the prompt", () => {
    const viewport = { x: 200, y: 100, width: 800, height: 600 };
    // Center should be at (600, 400)
    const prompt = buildSystemPrompt([], viewport);
    expect(prompt).toContain("600");
    expect(prompt).toContain("400");
  });

  it("Current Selection section appears before Board State section", () => {
    const obj = makeBoardObject({
      id: "44444444-4444-4444-4444-444444444444",
      content: "Selected item",
    });

    const prompt = buildSystemPrompt([obj], DEFAULT_VIEWPORT, [
      "44444444-4444-4444-4444-444444444444",
    ]);

    const selectionIndex = prompt.indexOf("## Current Selection");
    const boardStateIndex = prompt.indexOf("## Board State");

    expect(selectionIndex).toBeGreaterThan(-1);
    expect(boardStateIndex).toBeGreaterThan(-1);
    expect(selectionIndex).toBeLessThan(boardStateIndex);
  });

  it("does not include Current Selection section when selectedIds is empty array", () => {
    const obj = makeBoardObject({
      id: "55555555-5555-5555-5555-555555555555",
      content: "Not selected",
    });

    const prompt = buildSystemPrompt([obj], DEFAULT_VIEWPORT, []);

    expect(prompt).not.toContain("## Current Selection");
  });

  it("does not include Current Selection section when selectedIds do not match any objects", () => {
    const obj = makeBoardObject({
      id: "66666666-6666-6666-6666-666666666666",
      content: "Unmatched object",
    });

    const prompt = buildSystemPrompt([obj], DEFAULT_VIEWPORT, [
      "ffffffff-ffff-ffff-ffff-ffffffffffff",
    ]);

    expect(prompt).not.toContain("## Current Selection");
  });

  it("handles large viewport center values without error", () => {
    const largeViewport = { x: 99999, y: 99999, width: 800, height: 600 };
    // Center should be at (100399, 100299)
    const prompt = buildSystemPrompt([], largeViewport);

    expect(prompt).toContain("100399");
    expect(prompt).toContain("100299");
  });

  it("Color Palette section contains all 12 named colors", () => {
    const prompt = buildSystemPrompt([], DEFAULT_VIEWPORT);
    const lower = prompt.toLowerCase();

    expect(lower).toContain("yellow");
    expect(lower).toContain("blue");
    expect(lower).toContain("green");
    expect(lower).toContain("pink");
    expect(lower).toContain("orange");
    expect(lower).toContain("purple");
    expect(lower).toContain("red");
    expect(lower).toContain("teal");
    expect(lower).toContain("lime");
    expect(lower).toContain("gray");
    expect(lower).toContain("amber");
    expect(lower).toContain("indigo");
  });

  it("Out of Scope section contains a refusal message referencing board operations", () => {
    const prompt = buildSystemPrompt([], DEFAULT_VIEWPORT);
    const lower = prompt.toLowerCase();

    // The refusal message should reference board objects or board actions
    const mentionsBoardObjects = lower.includes("board");
    const mentionsOperations =
      lower.includes("whiteboard operations") ||
      lower.includes("objects on the board") ||
      lower.includes("board action");

    expect(mentionsBoardObjects).toBe(true);
    expect(mentionsOperations).toBe(true);
  });
});

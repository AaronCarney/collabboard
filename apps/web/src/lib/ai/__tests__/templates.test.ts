import { describe, it, expect } from "vitest";
import { boardObjectSchema } from "@collabboard/shared";
import { matchTemplate, generateTemplate } from "../templates";

const BOARD_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "user-1";
const CENTER = { x: 400, y: 300 };

describe("matchTemplate", () => {
  it("matches SWOT analysis commands", () => {
    expect(matchTemplate("Create a SWOT analysis")).toBe("swot");
    expect(matchTemplate("make a swot template")).toBe("swot");
    expect(matchTemplate("SWOT diagram")).toBe("swot");
  });

  it("matches Kanban board commands", () => {
    expect(matchTemplate("Create a kanban board")).toBe("kanban");
    expect(matchTemplate("make a Kanban")).toBe("kanban");
  });

  it("matches retrospective commands", () => {
    expect(matchTemplate("Create a retrospective")).toBe("retrospective");
    expect(matchTemplate("retro template")).toBe("retrospective");
    expect(matchTemplate("sprint retrospective")).toBe("retrospective");
  });

  it("matches brainstorm grid commands", () => {
    expect(matchTemplate("brainstorm session")).toBe("brainstorm");
    expect(matchTemplate("brainstorming grid")).toBe("brainstorm");
  });

  it("matches user journey commands", () => {
    expect(matchTemplate("user journey map")).toBe("user_journey");
    expect(matchTemplate("create a user journey")).toBe("user_journey");
  });

  it("returns null for non-template commands", () => {
    expect(matchTemplate("create a sticky note")).toBeNull();
    expect(matchTemplate("move all objects left")).toBeNull();
    expect(matchTemplate("change color to red")).toBeNull();
  });

  // ── AC-9: Enhanced Template Router — new synonym patterns ──

  it('matches "strengths and weaknesses analysis" to swot', () => {
    expect(matchTemplate("strengths and weaknesses analysis")).toBe("swot");
  });

  it('matches "strengths and weaknesses" to swot', () => {
    expect(matchTemplate("strengths and weaknesses")).toBe("swot");
  });

  it('matches "to do doing done" to kanban', () => {
    expect(matchTemplate("to do doing done")).toBe("kanban");
  });

  it('matches "task board" to kanban', () => {
    expect(matchTemplate("task board")).toBe("kanban");
  });

  it('matches "start stop continue" to retrospective', () => {
    expect(matchTemplate("start stop continue")).toBe("retrospective");
  });

  it('matches "what went well" to retrospective', () => {
    expect(matchTemplate("what went well")).toBe("retrospective");
  });

  it('matches "went well didn\'t go well" to retrospective', () => {
    expect(matchTemplate("went well didn't go well")).toBe("retrospective");
  });

  it('matches "idea generation" to brainstorm', () => {
    expect(matchTemplate("idea generation")).toBe("brainstorm");
  });

  it('matches "brain storm" (with space) to brainstorm', () => {
    expect(matchTemplate("brain storm")).toBe("brainstorm");
  });

  it('matches "customer journey" to user_journey', () => {
    expect(matchTemplate("customer journey")).toBe("user_journey");
  });

  it('matches "user flow map" to user_journey', () => {
    expect(matchTemplate("user flow map")).toBe("user_journey");
  });

  // ── AC-9: Negative cases — must NOT match ──

  it('does NOT match "what are my strengths" (not a SWOT request)', () => {
    expect(matchTemplate("what are my strengths")).toBeNull();
  });

  it('does NOT match "do a good job" (contains "do" but not kanban pattern)', () => {
    expect(matchTemplate("do a good job")).toBeNull();
  });

  // ── Edge cases: case insensitivity for new patterns ──

  it('matches "STRENGTHS AND WEAKNESSES" (all caps) to swot', () => {
    expect(matchTemplate("STRENGTHS AND WEAKNESSES")).toBe("swot");
  });

  it('matches "Strengths And Weaknesses" (title case) to swot', () => {
    expect(matchTemplate("Strengths And Weaknesses")).toBe("swot");
  });

  it('matches "TASK BOARD" (all caps) to kanban', () => {
    expect(matchTemplate("TASK BOARD")).toBe("kanban");
  });

  it('matches "Task Board" (title case) to kanban', () => {
    expect(matchTemplate("Task Board")).toBe("kanban");
  });

  // ── Edge cases: partial match resistance ──

  it('matches "brainstorming session" to brainstorm (not a spurious mismatch)', () => {
    // brain*storm*(ing)? covers "brainstorming"
    expect(matchTemplate("brainstorming session")).toBe("brainstorm");
  });

  it('does NOT match "journey" alone to user_journey (requires user|customer prefix)', () => {
    expect(matchTemplate("journey")).toBeNull();
  });

  it('does NOT match "flow map" alone to user_journey (requires user|customer prefix)', () => {
    expect(matchTemplate("flow map")).toBeNull();
  });

  it('does NOT match "customer" alone to user_journey', () => {
    expect(matchTemplate("customer")).toBeNull();
  });

  // ── Edge cases: multi-word with extra (double) spaces ──

  it('matches "strengths  and  weaknesses" (double spaces) to swot via \\s+ quantifier', () => {
    // \s+ matches one or more whitespace characters, so double spaces still match
    expect(matchTemplate("strengths  and  weaknesses")).toBe("swot");
  });

  it('matches "task  board" (double space) to kanban via \\s+ quantifier', () => {
    expect(matchTemplate("task  board")).toBe("kanban");
  });

  // ── Edge cases: combined commands (first pattern wins) ──

  it('matches "create a swot and kanban" to swot (first matching pattern wins)', () => {
    // TEMPLATE_PATTERNS iterates in order; swot appears before kanban
    expect(matchTemplate("create a swot and kanban")).toBe("swot");
  });

  it('matches "kanban and retrospective board" to kanban (kanban pattern precedes retrospective)', () => {
    expect(matchTemplate("kanban and retrospective board")).toBe("kanban");
  });

  // ── Edge cases: empty and whitespace-only input ──

  it("returns null for empty string", () => {
    expect(matchTemplate("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(matchTemplate("   ")).toBeNull();
  });

  it("returns null for newline-only string", () => {
    expect(matchTemplate("\n")).toBeNull();
  });
});

describe("generateTemplate", () => {
  it("generates valid SWOT objects", () => {
    const result = generateTemplate("swot", BOARD_ID, USER_ID, CENTER);
    expect(result.objects.length).toBeGreaterThanOrEqual(4);
    expect(result.message).toContain("SWOT");
    for (const obj of result.objects) {
      expect(boardObjectSchema.safeParse(obj).success).toBe(true);
    }
  });

  it("generates valid Kanban objects", () => {
    const result = generateTemplate("kanban", BOARD_ID, USER_ID, CENTER);
    expect(result.objects.length).toBeGreaterThanOrEqual(3);
    expect(result.message).toContain("Kanban");
    for (const obj of result.objects) {
      expect(boardObjectSchema.safeParse(obj).success).toBe(true);
    }
  });

  it("generates valid retrospective objects", () => {
    const result = generateTemplate("retrospective", BOARD_ID, USER_ID, CENTER);
    expect(result.objects.length).toBeGreaterThanOrEqual(3);
    for (const obj of result.objects) {
      expect(boardObjectSchema.safeParse(obj).success).toBe(true);
    }
  });

  it("generates valid brainstorm objects", () => {
    const result = generateTemplate("brainstorm", BOARD_ID, USER_ID, CENTER);
    expect(result.objects.length).toBeGreaterThanOrEqual(1);
    for (const obj of result.objects) {
      expect(boardObjectSchema.safeParse(obj).success).toBe(true);
    }
  });

  it("generates valid user journey objects", () => {
    const result = generateTemplate("user_journey", BOARD_ID, USER_ID, CENTER);
    expect(result.objects.length).toBeGreaterThanOrEqual(3);
    for (const obj of result.objects) {
      expect(boardObjectSchema.safeParse(obj).success).toBe(true);
    }
  });

  it("all generated objects have unique IDs", () => {
    const result = generateTemplate("swot", BOARD_ID, USER_ID, CENTER);
    const ids = result.objects.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("positions objects relative to viewport center", () => {
    const result = generateTemplate("swot", BOARD_ID, USER_ID, { x: 1000, y: 800 });
    // All objects should be near the viewport center
    for (const obj of result.objects) {
      expect(Math.abs(obj.x - 1000)).toBeLessThan(600);
      expect(Math.abs(obj.y - 800)).toBeLessThan(600);
    }
  });
});

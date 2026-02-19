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

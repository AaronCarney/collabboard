import { describe, it, expect, vi } from "vitest";
import { boardObjectSchema } from "@collabboard/shared";
import { routeCommand } from "../command-router";
import type { BoardObject } from "@collabboard/shared";

// Mock observability — no real tracing in tests
vi.mock("../observability/instrument", () => ({
  instrument: vi.fn().mockResolvedValue(undefined),
}));

// Mock the AI SDK — no real LLM calls in tests
vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({
    text: "",
    toolCalls: [
      {
        toolName: "createStickyNote",
        input: { text: "Test note", x: 100, y: 100, color: "#FFEB3B" },
      },
    ],
    usage: { inputTokens: 100, outputTokens: 50 },
  }),
  stepCountIs: vi.fn(() => () => false),
  tool: vi.fn((def: Record<string, unknown>) => def),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn(() => "mocked-model"),
}));

const BOARD_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "user-1";

function makeObjects(): BoardObject[] {
  return [
    {
      id: "22222222-2222-2222-2222-222222222222",
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

describe("routeCommand", () => {
  it("routes template commands to template generator (bypass LLM)", async () => {
    const result = await routeCommand({
      command: "Create a SWOT analysis",
      boardId: BOARD_ID,
      userId: USER_ID,
      existingObjects: [],
      viewportCenter: { x: 400, y: 300 },
    });

    expect(result.isTemplate).toBe(true);
    expect(result.success).toBe(true);
    expect(result.objects.length).toBeGreaterThanOrEqual(4);
    expect(result.message).toContain("SWOT");
    expect(result.tokensUsed).toBe(0);
    for (const obj of result.objects) {
      expect(boardObjectSchema.safeParse(obj).success).toBe(true);
    }
  });

  it("routes kanban template", async () => {
    const result = await routeCommand({
      command: "make a kanban board",
      boardId: BOARD_ID,
      userId: USER_ID,
      existingObjects: [],
      viewportCenter: { x: 400, y: 300 },
    });

    expect(result.isTemplate).toBe(true);
    expect(result.message).toContain("Kanban");
  });

  it("routes non-template commands to LLM", async () => {
    const result = await routeCommand({
      command: "Create a yellow sticky note saying Hello",
      boardId: BOARD_ID,
      userId: USER_ID,
      existingObjects: makeObjects(),
      viewportCenter: { x: 400, y: 300 },
    });

    expect(result.isTemplate).toBe(false);
    expect(result.success).toBe(true);
    expect(result.objects.length).toBeGreaterThanOrEqual(1);
  });

  it("includes latency measurement", async () => {
    const result = await routeCommand({
      command: "Create a SWOT analysis",
      boardId: BOARD_ID,
      userId: USER_ID,
      existingObjects: [],
      viewportCenter: { x: 400, y: 300 },
    });

    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });
});

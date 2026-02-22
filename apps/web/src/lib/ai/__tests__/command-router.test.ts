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

  it("forwards selectedObjectIds to buildSystemPrompt for LLM commands", async () => {
    // Import the system-prompt module to spy on buildSystemPrompt
    const systemPromptModule = await import("../system-prompt");
    const buildSpy = vi.spyOn(systemPromptModule, "buildSystemPrompt");

    const selectedIds = [
      "22222222-2222-2222-2222-222222222222",
      "33333333-3333-3333-3333-333333333333",
    ];

    await routeCommand({
      command: "Change the color of the selected objects to blue",
      boardId: BOARD_ID,
      userId: USER_ID,
      existingObjects: makeObjects(),
      viewportCenter: { x: 400, y: 300 },
      selectedObjectIds: selectedIds,
    });

    // buildSystemPrompt should have been called with selectedIds as the 3rd argument
    expect(buildSpy).toHaveBeenCalledWith(expect.anything(), expect.anything(), selectedIds);

    buildSpy.mockRestore();
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

  // ---- B3: Tool naming — camelCase dispatch ----

  describe("camelCase tool dispatch (B3)", () => {
    it("dispatches createConnector toolCall (not create_connector) (AC8)", async () => {
      // Override the generateText mock to return a createConnector tool call
      const { generateText } = await import("ai");
      const mockedGenerateText = vi.mocked(generateText);
      mockedGenerateText.mockResolvedValueOnce({
        text: "",
        toolCalls: [
          {
            toolName: "createConnector",
            input: {
              fromId: "22222222-2222-2222-2222-222222222222",
              toId: "33333333-3333-3333-3333-333333333333",
              style: "arrow",
            },
          },
        ],
        usage: { inputTokens: 50, outputTokens: 25 },
      } as ReturnType<typeof generateText> extends Promise<infer U> ? U : never);

      const fromObj: BoardObject = {
        id: "22222222-2222-2222-2222-222222222222",
        board_id: BOARD_ID,
        type: "sticky_note",
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        rotation: 0,
        content: "Source",
        color: "#FFEB3B",
        version: 1,
        created_by: USER_ID,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        parent_frame_id: null,
        properties: {},
      };
      const toObj: BoardObject = {
        ...fromObj,
        id: "33333333-3333-3333-3333-333333333333",
        x: 500,
        content: "Target",
        color: "#90CAF9",
      };

      const result = await routeCommand({
        command: "Connect the two notes with an arrow",
        boardId: BOARD_ID,
        userId: USER_ID,
        existingObjects: [fromObj, toObj],
        viewportCenter: { x: 400, y: 300 },
      });

      // The router should successfully dispatch camelCase createConnector
      // and return a connector object
      expect(result.success).toBe(true);
      expect(result.objects.length).toBeGreaterThanOrEqual(1);
      const connector = result.objects.find((o) => o.type === "connector");
      expect(connector).toBeDefined();
    });

    it("dispatches deleteObject toolCall (not delete_object) (AC8)", async () => {
      // Override the generateText mock to return a deleteObject tool call
      const { generateText } = await import("ai");
      const mockedGenerateText = vi.mocked(generateText);
      mockedGenerateText.mockResolvedValueOnce({
        text: "",
        toolCalls: [
          {
            toolName: "deleteObject",
            input: { objectId: "22222222-2222-2222-2222-222222222222" },
          },
        ],
        usage: { inputTokens: 50, outputTokens: 25 },
      } as ReturnType<typeof generateText> extends Promise<infer U> ? U : never);

      const result = await routeCommand({
        command: "Delete the sticky note",
        boardId: BOARD_ID,
        userId: USER_ID,
        existingObjects: makeObjects(),
        viewportCenter: { x: 400, y: 300 },
      });

      // The router should dispatch deleteObject and populate deletedIds
      expect(result.success).toBe(true);
      expect(result.deletedIds).toBeDefined();
      expect(result.deletedIds).toContain("22222222-2222-2222-2222-222222222222");
    });
  });
});

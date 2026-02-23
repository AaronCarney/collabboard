import { describe, it, expect, vi } from "vitest";
import { boardObjectSchema } from "@collabboard/shared";
import { routeCommand } from "../command-router";
import type { BoardObject } from "@collabboard/shared";

// Mock observability — no real tracing in tests
vi.mock("../observability/instrument", () => ({
  instrument: vi.fn().mockResolvedValue(undefined),
}));

// Mock the AI SDK — structured output flow
const mockGenerateText = vi.fn();
vi.mock("ai", () => ({
  generateText: (...args: unknown[]): unknown => mockGenerateText(...args),
  Output: {
    object: vi.fn((opts: unknown) => opts),
  },
  NoObjectGeneratedError: class NoObjectGeneratedError extends Error {
    constructor(message?: string) {
      super(message ?? "No object generated");
      this.name = "NoObjectGeneratedError";
    }
  },
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn(() => "mocked-model"),
}));

// Mock plan-validator
const mockValidatePlan = vi.fn();
vi.mock("../plan-validator", () => ({
  validatePlan: (...args: unknown[]): unknown => mockValidatePlan(...args),
}));

// Mock plan-executor
const mockExecutePlan = vi.fn();
vi.mock("../plan-executor", () => ({
  executePlan: (...args: unknown[]): unknown => mockExecutePlan(...args),
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

function makeMockBoardObject(overrides?: Partial<BoardObject>): BoardObject {
  return {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    board_id: BOARD_ID,
    type: "sticky_note",
    x: 100,
    y: 100,
    width: 200,
    height: 200,
    rotation: 0,
    content: "AI created note",
    color: "#FFEB3B",
    version: 1,
    created_by: USER_ID,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    parent_frame_id: null,
    properties: {},
    ...overrides,
  };
}

const thePlan = {
  objects: [{ tempId: "t1", type: "sticky_note", content: "Hello" }],
  deletions: [],
  modifications: [],
  message: "Created a sticky note",
};

function setupSuccessfulMocks(): void {
  mockGenerateText.mockResolvedValue({
    output: thePlan,
    usage: { inputTokens: 100, outputTokens: 50 },
  });

  mockValidatePlan.mockReturnValue({
    valid: true,
    errors: [],
    corrected: thePlan,
  });

  mockExecutePlan.mockReturnValue({
    objects: [makeMockBoardObject()],
    deletedIds: [],
    modifiedObjects: [],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupSuccessfulMocks();
});

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

  it("routes non-template commands to structured output LLM", async () => {
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
    expect(mockGenerateText).toHaveBeenCalled();
  });

  it("calls generateText with Output.object and PlanSchema", async () => {
    await routeCommand({
      command: "Create a sticky note",
      boardId: BOARD_ID,
      userId: USER_ID,
      existingObjects: makeObjects(),
      viewportCenter: { x: 400, y: 300 },
    });

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        output: expect.objectContaining({ schema: expect.anything() }),
      })
    );
  });

  it("passes plan output to validatePlan", async () => {
    await routeCommand({
      command: "Create a sticky note",
      boardId: BOARD_ID,
      userId: USER_ID,
      existingObjects: makeObjects(),
      viewportCenter: { x: 400, y: 300 },
    });

    expect(mockValidatePlan).toHaveBeenCalledWith(thePlan, makeObjects());
  });

  it("passes validated plan to executePlan", async () => {
    await routeCommand({
      command: "Create a sticky note",
      boardId: BOARD_ID,
      userId: USER_ID,
      existingObjects: makeObjects(),
      viewportCenter: { x: 400, y: 300 },
    });

    expect(mockExecutePlan).toHaveBeenCalledWith(thePlan, BOARD_ID, USER_ID, makeObjects());
  });

  it("forwards selectedObjectIds to buildSystemPrompt for LLM commands", async () => {
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

  it("returns CommandResult with expected shape", async () => {
    const result = await routeCommand({
      command: "Create a sticky note",
      boardId: BOARD_ID,
      userId: USER_ID,
      existingObjects: makeObjects(),
      viewportCenter: { x: 400, y: 300 },
    });

    expect(result.success).toBe(true);
    expect(result.objects).toBeDefined();
    expect(result.deletedIds).toBeUndefined();
    expect(result.message).toBeDefined();
    expect(result.tokensUsed).toBeGreaterThanOrEqual(0);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.isTemplate).toBe(false);
  });

  it("retries on NoObjectGeneratedError", async () => {
    const { NoObjectGeneratedError } = await import("ai");
    mockGenerateText.mockRejectedValueOnce(new NoObjectGeneratedError()).mockResolvedValueOnce({
      output: thePlan,
      usage: { inputTokens: 100, outputTokens: 50 },
    });

    const result = await routeCommand({
      command: "Create a sticky note",
      boardId: BOARD_ID,
      userId: USER_ID,
      existingObjects: makeObjects(),
      viewportCenter: { x: 400, y: 300 },
    });

    expect(result.success).toBe(true);
    expect(mockGenerateText).toHaveBeenCalledTimes(2);
  });

  it("returns error when output is null", async () => {
    mockGenerateText.mockResolvedValueOnce({
      output: null,
      usage: { inputTokens: 50, outputTokens: 0 },
    });

    const result = await routeCommand({
      command: "Create a sticky note",
      boardId: BOARD_ID,
      userId: USER_ID,
      existingObjects: makeObjects(),
      viewportCenter: { x: 400, y: 300 },
    });

    expect(result.success).toBe(false);
  });

  it("returns deletedIds when plan has deletions", async () => {
    mockExecutePlan.mockReturnValue({
      objects: [],
      deletedIds: ["22222222-2222-2222-2222-222222222222"],
      modifiedObjects: [],
    });

    const result = await routeCommand({
      command: "Delete the sticky note",
      boardId: BOARD_ID,
      userId: USER_ID,
      existingObjects: makeObjects(),
      viewportCenter: { x: 400, y: 300 },
    });

    expect(result.success).toBe(true);
    expect(result.deletedIds).toContain("22222222-2222-2222-2222-222222222222");
  });
});

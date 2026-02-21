import { describe, it, expect, vi, beforeEach } from "vitest";
import { instrument, redactPrompt } from "../instrument";
import type { TraceData } from "../instrument";

// Mock the tracer modules
vi.mock("../langsmith", () => ({
  traceLangSmith: vi.fn().mockResolvedValue(undefined),
  isLangSmithEnabled: vi.fn().mockReturnValue(true),
}));

vi.mock("../langfuse", () => ({
  traceLangFuse: vi.fn().mockResolvedValue(undefined),
  isLangFuseEnabled: vi.fn().mockReturnValue(true),
}));

import { traceLangSmith } from "../langsmith";
import { traceLangFuse } from "../langfuse";

beforeEach(() => {
  vi.clearAllMocks();
});

function makeTraceData(overrides: Partial<TraceData> = {}): TraceData {
  return {
    userId: "user-1",
    boardId: "board-1",
    command: "Create a sticky note",
    commandType: "llm",
    prompt: "You are an AI assistant...",
    completion: '{"toolCalls": []}',
    tokensUsed: 150,
    latencyMs: 520,
    success: true,
    ...overrides,
  };
}

describe("instrument", () => {
  it("calls both LangSmith and LangFuse tracers", async () => {
    const data = makeTraceData();
    await instrument(data);

    expect(traceLangSmith).toHaveBeenCalledOnce();
    expect(traceLangSmith).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: data.userId,
        boardId: data.boardId,
        command: data.command,
      })
    );
    expect(traceLangFuse).toHaveBeenCalledOnce();
    expect(traceLangFuse).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: data.userId,
        boardId: data.boardId,
        command: data.command,
      })
    );
  });

  it("passes correct metadata to tracers", async () => {
    const data = makeTraceData({
      userId: "user-42",
      command: "Make a SWOT analysis",
      commandType: "template",
      tokensUsed: 0,
      latencyMs: 5,
    });

    await instrument(data);

    expect(traceLangSmith).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-42",
        commandType: "template",
        tokensUsed: 0,
      })
    );
  });

  it("does not throw when LangSmith fails", async () => {
    (traceLangSmith as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("LangSmith connection failed")
    );

    const data = makeTraceData();
    // Should not throw
    await expect(instrument(data)).resolves.toBeUndefined();
    // LangFuse should still have been called
    expect(traceLangFuse).toHaveBeenCalledOnce();
  });

  it("does not throw when LangFuse fails", async () => {
    (traceLangFuse as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("LangFuse connection failed")
    );

    const data = makeTraceData();
    await expect(instrument(data)).resolves.toBeUndefined();
    expect(traceLangSmith).toHaveBeenCalledOnce();
  });

  it("does not throw when both tracers fail", async () => {
    (traceLangSmith as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("LangSmith down"));
    (traceLangFuse as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("LangFuse down"));

    const data = makeTraceData();
    await expect(instrument(data)).resolves.toBeUndefined();
  });

  it("captures error details on failed commands", async () => {
    const data = makeTraceData({
      success: false,
      error: "Model returned invalid JSON",
    });

    await instrument(data);

    expect(traceLangSmith).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "Model returned invalid JSON",
      })
    );
    expect(traceLangFuse).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "Model returned invalid JSON",
      })
    );
  });

  it("resolves quickly (fire-and-forget pattern)", async () => {
    // Simulate slow tracers
    (traceLangSmith as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );
    (traceLangFuse as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    const data = makeTraceData();
    const start = Date.now();
    await instrument(data);
    const elapsed = Date.now() - start;

    // Promise.allSettled waits for both, but neither should block significantly
    // In production this would be fire-and-forget (no await), but in tests we await for verification
    expect(elapsed).toBeLessThan(500);
  });
});

describe("redactPrompt", () => {
  it("replaces Board State section content with redaction marker", () => {
    const prompt = [
      "## Role",
      "You are CollabBoard AI.",
      "",
      "## Board State",
      "SELECTED (2 objects):",
      '- sticky_note id=abc x=100 y=200 color=yellow "Secret user data"',
      "",
      "## Current Selection",
      "No objects selected.",
    ].join("\n");

    const redacted = redactPrompt(prompt);

    expect(redacted).toContain("## Role");
    expect(redacted).toContain("## Current Selection");
    expect(redacted).not.toContain("Secret user data");
    expect(redacted).not.toContain("sticky_note");
    expect(redacted).toMatch(/\[REDACTED — \d+ chars\]/);
  });

  it("returns prompt unchanged when no Board State section exists", () => {
    const prompt = "## Role\nYou are CollabBoard AI.\n## Rules\nDo things.";
    expect(redactPrompt(prompt)).toBe(prompt);
  });

  it("handles Board State at end of prompt (no following section)", () => {
    const prompt = "## Role\nAI assistant.\n## Board State\nSELECTED: abc\nviewport data here";
    const redacted = redactPrompt(prompt);
    expect(redacted).toContain("## Role");
    expect(redacted).not.toContain("viewport data here");
    expect(redacted).not.toContain("SELECTED: abc");
  });
});

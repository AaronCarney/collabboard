import { describe, it, expect } from "vitest";
import { classifyError, ERROR_MESSAGES } from "../error-handler";
import type { AIErrorCategory } from "../error-handler";

// ─────────────────────────────────────────────────────────────
// classifyError — status-based classification
// ─────────────────────────────────────────────────────────────

describe("classifyError", () => {
  it("returns 'service_unavailable' for HTTP 429 (rate limit)", () => {
    const err = Object.assign(new Error("rate limited"), { status: 429 });
    expect(classifyError(err)).toBe("service_unavailable");
  });

  it("returns 'service_unavailable' for HTTP 500", () => {
    const err = Object.assign(new Error("internal server error"), {
      status: 500,
    });
    expect(classifyError(err)).toBe("service_unavailable");
  });

  it("returns 'service_unavailable' for HTTP 503", () => {
    const err = Object.assign(new Error("service unavailable"), {
      status: 503,
    });
    expect(classifyError(err)).toBe("service_unavailable");
  });

  it("returns 'service_unavailable' for HTTP 502", () => {
    const err = Object.assign(new Error("bad gateway"), { status: 502 });
    expect(classifyError(err)).toBe("service_unavailable");
  });

  // ─────────────────────────────────────────────────────────────
  // classifyError — tool call result classification
  // ─────────────────────────────────────────────────────────────

  it("returns 'partial_failure' when some tool calls succeed and some fail", () => {
    const err = new Error("partial failure");
    const toolCallResults = [
      { success: true, toolName: "createStickyNote" },
      { success: false, toolName: "moveObject", error: "not found" },
    ];
    expect(classifyError(err, toolCallResults)).toBe("partial_failure");
  });

  it("returns 'execution_error' when all tool calls fail", () => {
    const err = new Error("all failed");
    const toolCallResults = [
      { success: false, toolName: "createStickyNote", error: "bad input" },
      { success: false, toolName: "moveObject", error: "not found" },
    ];
    expect(classifyError(err, toolCallResults)).toBe("execution_error");
  });

  it("returns 'no_understand' when zero tool calls were generated", () => {
    const err = new Error("no tools");
    const toolCallResults: unknown[] = [];
    expect(classifyError(err, toolCallResults)).toBe("no_understand");
  });

  // ─────────────────────────────────────────────────────────────
  // classifyError — generic fallback
  // ─────────────────────────────────────────────────────────────

  it("returns 'execution_error' for a generic Error with no status or tool results", () => {
    const err = new Error("something went wrong");
    expect(classifyError(err)).toBe("execution_error");
  });
});

// ─────────────────────────────────────────────────────────────
// ERROR_MESSAGES record
// ─────────────────────────────────────────────────────────────

describe("ERROR_MESSAGES", () => {
  const ALL_CATEGORIES: AIErrorCategory[] = [
    "no_understand",
    "out_of_scope",
    "execution_error",
    "service_unavailable",
    "partial_failure",
  ];

  it("has an entry for every AIErrorCategory", () => {
    for (const category of ALL_CATEGORIES) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(ERROR_MESSAGES).toHaveProperty(category);
    }
  });

  it("every message is a non-empty string", () => {
    for (const category of ALL_CATEGORIES) {
      const msg = ERROR_MESSAGES[category];
      expect(typeof msg).toBe("string");
      expect(msg.length).toBeGreaterThan(0);
    }
  });

  it("messages contain actionable guidance (not just the category name)", () => {
    for (const category of ALL_CATEGORIES) {
      const msg = ERROR_MESSAGES[category];
      // Messages should be longer than just the category slug
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(msg.length).toBeGreaterThan(category.length);
    }
  });
});

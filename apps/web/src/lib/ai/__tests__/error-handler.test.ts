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

  // ─────────────────────────────────────────────────────────────
  // classifyError — non-Error thrown values
  // ─────────────────────────────────────────────────────────────

  it("returns 'execution_error' when a string is thrown", () => {
    expect(classifyError("something went wrong")).toBe("execution_error");
  });

  it("returns 'execution_error' when a number is thrown", () => {
    expect(classifyError(42)).toBe("execution_error");
  });

  it("returns 'execution_error' when null is thrown", () => {
    expect(classifyError(null)).toBe("execution_error");
  });

  it("returns 'execution_error' when undefined is thrown", () => {
    expect(classifyError(undefined)).toBe("execution_error");
  });

  // ─────────────────────────────────────────────────────────────
  // classifyError — client errors (4xx, not 429)
  // ─────────────────────────────────────────────────────────────

  it("returns 'execution_error' for HTTP 499 (client error, not rate-limit)", () => {
    const err = Object.assign(new Error("client closed request"), {
      status: 499,
    });
    expect(classifyError(err)).toBe("execution_error");
  });

  it("returns 'execution_error' for HTTP 400 (bad request)", () => {
    const err = Object.assign(new Error("bad request"), { status: 400 });
    expect(classifyError(err)).toBe("execution_error");
  });

  // ─────────────────────────────────────────────────────────────
  // classifyError — all-success tool call results
  // ─────────────────────────────────────────────────────────────

  it("returns 'execution_error' (not 'partial_failure') when all tool calls succeed", () => {
    const err = new Error("unexpected");
    const toolCallResults = [
      { success: true, toolName: "createStickyNote" },
      { success: true, toolName: "moveObject" },
    ];
    expect(classifyError(err, toolCallResults)).toBe("execution_error");
  });

  // ─────────────────────────────────────────────────────────────
  // classifyError — toolCallResults undefined vs empty array
  // ─────────────────────────────────────────────────────────────

  it("returns 'execution_error' when toolCallResults is undefined", () => {
    const err = new Error("no tool results");
    expect(classifyError(err, undefined)).toBe("execution_error");
  });

  it("returns 'no_understand' when toolCallResults is an empty array", () => {
    const err = new Error("no tools generated");
    expect(classifyError(err, [])).toBe("no_understand");
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
      expect(msg.length).toBeGreaterThan(category.length);
    }
  });
});

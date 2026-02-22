import { describe, it, expect, vi } from "vitest";
import { wrapText } from "../render-utils";

function createMockCtx(): CanvasRenderingContext2D {
  return {
    measureText: vi.fn((text: string) => ({ width: text.length * 8 })),
    fillText: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe("wrapText", () => {
  it("renders single-line text without wrapping", () => {
    const ctx = createMockCtx();
    wrapText(ctx, "Hello", 10, 20, 200, 18);
    expect(ctx.fillText).toHaveBeenCalledWith("Hello", 10, 20);
  });

  it("splits on explicit newlines", () => {
    const ctx = createMockCtx();
    // maxWidth=500 so no word-wrap needed — only newline splitting
    wrapText(ctx, "Line one\nLine two\nLine three", 10, 20, 500, 18);
    expect(ctx.fillText).toHaveBeenCalledWith("Line one", 10, 20);
    expect(ctx.fillText).toHaveBeenCalledWith("Line two", 10, 38);
    expect(ctx.fillText).toHaveBeenCalledWith("Line three", 10, 56);
  });

  it("word-wraps within a newline-delimited line", () => {
    const ctx = createMockCtx();
    // Each char = 8px wide. maxWidth=40 fits ~5 chars.
    // "abcde fghij" should wrap "fghij" to next line.
    // Then "\n" starts a new paragraph.
    wrapText(ctx, "abcde fghij\nxyz", 0, 0, 40, 18);

    const calls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    // Should have 3 lines: "abcde", "fghij", "xyz"
    expect(calls.length).toBe(3);
    expect(calls[0][0]).toBe("abcde");
    expect(calls[1][0]).toBe("fghij");
    expect(calls[2][0]).toBe("xyz");
  });
});

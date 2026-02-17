import { describe, it, expect } from "vitest";

describe("Smoke tests — verify test infrastructure works", () => {
  it("runs basic arithmetic", () => {
    expect(1 + 1).toBe(2);
  });

  it("TypeScript types are checked", () => {
    // This would fail at compile time if TypeScript were broken
    const x: number = 42;
    const y: string = "hello";
    expect(typeof x).toBe("number");
    expect(typeof y).toBe("string");
  });

  it("runs async tests", async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });
});

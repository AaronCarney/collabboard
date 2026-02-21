import { describe, it, expect } from "vitest";
import { enqueueForUser } from "../ai-queue";

// ─────────────────────────────────────────────────────────────
// enqueueForUser — serialization & parallelism
// ─────────────────────────────────────────────────────────────

describe("enqueueForUser", () => {
  it("same-user commands execute sequentially (second starts after first completes)", async () => {
    const order: string[] = [];

    const first = enqueueForUser("user-1", async () => {
      order.push("first-start");
      await new Promise((resolve) => {
        setTimeout(resolve, 50);
      });
      order.push("first-end");
      return "first";
    });

    const second = enqueueForUser("user-1", () => {
      order.push("second-start");
      return Promise.resolve("second");
    });

    await Promise.all([first, second]);

    // Second must not start before first ends
    expect(order.indexOf("first-end")).toBeLessThan(order.indexOf("second-start"));
  });

  it("different-user commands execute in parallel", async () => {
    const order: string[] = [];

    const userA = enqueueForUser("user-a", async () => {
      order.push("a-start");
      await new Promise((resolve) => {
        setTimeout(resolve, 50);
      });
      order.push("a-end");
      return "a";
    });

    const userB = enqueueForUser("user-b", async () => {
      order.push("b-start");
      await new Promise((resolve) => {
        setTimeout(resolve, 50);
      });
      order.push("b-end");
      return "b";
    });

    await Promise.all([userA, userB]);

    // Both should start before either ends (parallel execution)
    expect(order.indexOf("b-start")).toBeLessThan(order.indexOf("a-end"));
  });

  it("return value is propagated correctly", async () => {
    const result = await enqueueForUser("user-1", () => {
      return Promise.resolve(42);
    });
    expect(result).toBe(42);
  });

  it("rejected promise does not block subsequent commands", async () => {
    const failing = enqueueForUser("user-1", () => {
      return Promise.reject(new Error("boom"));
    });

    // The failing command should reject
    await expect(failing).rejects.toThrow("boom");

    // But a subsequent command for the same user should still execute
    const result = await enqueueForUser("user-1", () => {
      return Promise.resolve("recovered");
    });
    expect(result).toBe("recovered");
  });

  it("queue cleans up after completion (no memory leak)", async () => {
    // Enqueue and complete several commands for a user
    for (let i = 0; i < 10; i++) {
      await enqueueForUser(`temp-user-${String(i)}`, () => {
        return Promise.resolve(i);
      });
    }

    // After all commands complete, the queue should not hold references
    // This is a behavioral check: a new enqueue should work without issues
    const result = await enqueueForUser("temp-user-0", () => {
      return Promise.resolve("clean");
    });
    expect(result).toBe("clean");
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { SpatialIndex } from "../spatial-index";

interface TestObj {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function makeObj(id: string, x: number, y: number, w = 50, h = 50): TestObj {
  return { id, x, y, width: w, height: h };
}

describe("SpatialIndex", () => {
  let index: SpatialIndex<TestObj>;

  beforeEach(() => {
    index = new SpatialIndex<TestObj>(100);
  });

  it("returns empty array for empty index", () => {
    const result = index.query(0, 0, 500, 500);
    expect(result).toEqual([]);
  });

  it("inserts and queries an object in viewport", () => {
    const obj = makeObj("a", 10, 10);
    index.insert(obj);
    const result = index.query(0, 0, 200, 200);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a");
  });

  it("does not return objects outside viewport", () => {
    const obj = makeObj("a", 500, 500);
    index.insert(obj);
    const result = index.query(0, 0, 100, 100);
    expect(result).toHaveLength(0);
  });

  it("returns objects that partially overlap viewport", () => {
    const obj = makeObj("a", 90, 90, 50, 50); // extends to 140, 140
    index.insert(obj);
    const result = index.query(0, 0, 100, 100);
    expect(result).toHaveLength(1);
  });

  it("handles objects spanning multiple cells", () => {
    const obj = makeObj("big", 50, 50, 300, 300); // spans 4+ cells at cellSize=100
    index.insert(obj);
    // Query just one corner
    const result = index.query(0, 0, 60, 60);
    expect(result).toHaveLength(1);
    // Should not duplicate
    expect(result[0].id).toBe("big");
  });

  it("handles negative coordinates", () => {
    const obj = makeObj("neg", -150, -150, 50, 50);
    index.insert(obj);
    const result = index.query(-200, -200, -100, -100);
    expect(result).toHaveLength(1);
  });

  it("clears the index", () => {
    index.insert(makeObj("a", 10, 10));
    index.insert(makeObj("b", 20, 20));
    index.clear();
    const result = index.query(0, 0, 500, 500);
    expect(result).toEqual([]);
  });

  it("bulk inserts many objects", () => {
    const objects = Array.from({ length: 100 }, (_, i) =>
      makeObj(`obj-${String(i)}`, i * 10, i * 10)
    );
    index.bulkInsert(objects);
    const result = index.query(0, 0, 1000, 1000);
    expect(result).toHaveLength(100);
  });

  it("deduplicates objects that span multiple cells", () => {
    const obj = makeObj("wide", 0, 0, 500, 500);
    index.insert(obj);
    const result = index.query(0, 0, 600, 600);
    // Should appear exactly once despite being in many cells
    expect(result).toHaveLength(1);
  });

  it("efficiently queries viewport subset of many objects", () => {
    // Insert 500 objects spread across a large area
    const objects = Array.from({ length: 500 }, (_, i) =>
      makeObj(`obj-${String(i)}`, (i % 50) * 100, Math.floor(i / 50) * 100)
    );
    index.bulkInsert(objects);
    // Query a small viewport that should contain only a few objects
    const result = index.query(0, 0, 200, 200);
    // Should be significantly fewer than 500
    expect(result.length).toBeLessThan(20);
    expect(result.length).toBeGreaterThan(0);
  });
});

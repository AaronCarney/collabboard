import { describe, it, expect } from "vitest";
import { pointInPolygon, getTriangleVertices, getStarVertices } from "../geometry-utils";

describe("pointInPolygon", () => {
  const square = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];

  it("returns true for point inside polygon", () => {
    expect(pointInPolygon(50, 50, square)).toBe(true);
  });

  it("returns false for point outside polygon", () => {
    expect(pointInPolygon(150, 50, square)).toBe(false);
  });

  it("returns false for point clearly outside", () => {
    expect(pointInPolygon(-10, -10, square)).toBe(false);
  });

  it("handles triangle polygon", () => {
    const tri = [
      { x: 50, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
    ];
    // Center of triangle
    expect(pointInPolygon(50, 60, tri)).toBe(true);
    // Outside triangle (top-left corner of bounding box)
    expect(pointInPolygon(5, 5, tri)).toBe(false);
  });
});

describe("getTriangleVertices", () => {
  it("returns 3 vertices", () => {
    const verts = getTriangleVertices(0, 0, 200, 173);
    expect(verts).toHaveLength(3);
  });

  it("top vertex is centered horizontally", () => {
    const verts = getTriangleVertices(100, 50, 200, 173);
    // top-center: x + width/2, y
    expect(verts[0]).toEqual({ x: 200, y: 50 });
  });

  it("bottom-left vertex is at (x, y+h)", () => {
    const verts = getTriangleVertices(100, 50, 200, 173);
    expect(verts[1]).toEqual({ x: 100, y: 223 });
  });

  it("bottom-right vertex is at (x+w, y+h)", () => {
    const verts = getTriangleVertices(100, 50, 200, 173);
    expect(verts[2]).toEqual({ x: 300, y: 223 });
  });
});

describe("getStarVertices", () => {
  it("returns 10 vertices", () => {
    const verts = getStarVertices(0, 0, 200, 200);
    expect(verts).toHaveLength(10);
  });

  it("first vertex is top-center (outer)", () => {
    const verts = getStarVertices(0, 0, 200, 200);
    const cx = 100;
    const cy = 100;
    const outerR = 100;
    // First vertex at angle -PI/2 (top): cx + outerR*cos(-PI/2), cy + outerR*sin(-PI/2)
    expect(verts[0].x).toBeCloseTo(cx, 0);
    expect(verts[0].y).toBeCloseTo(cy - outerR, 0);
  });

  it("alternates between outer and inner radii", () => {
    const verts = getStarVertices(0, 0, 200, 200);
    const cx = 100;
    const cy = 100;
    // Outer radius for x = 100, inner = 100 * 0.382 = 38.2
    // Distance from center for vertex 0 (outer) should be ~100
    const d0 = Math.sqrt((verts[0].x - cx) ** 2 + (verts[0].y - cy) ** 2);
    // Distance from center for vertex 1 (inner) should be ~38.2
    const d1 = Math.sqrt((verts[1].x - cx) ** 2 + (verts[1].y - cy) ** 2);
    expect(d0).toBeCloseTo(100, 0);
    expect(d1).toBeCloseTo(38.2, 0);
  });

  it("inner radius is 0.382 of outer radius", () => {
    const verts = getStarVertices(50, 50, 100, 100);
    const cx = 100;
    const cy = 100;
    const outerR = 50;
    const innerR = outerR * 0.382;
    // Check an inner vertex (index 1)
    const d1 = Math.sqrt((verts[1].x - cx) ** 2 + (verts[1].y - cy) ** 2);
    expect(d1).toBeCloseTo(innerR, 0);
  });
});

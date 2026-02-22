/**
 * Ray-casting algorithm to determine if a point is inside a polygon.
 */
export function pointInPolygon(
  px: number,
  py: number,
  vertices: { x: number; y: number }[]
): boolean {
  let inside = false;
  const n = vertices.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = vertices[i].x;
    const yi = vertices[i].y;
    const xj = vertices[j].x;
    const yj = vertices[j].y;

    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Returns 3 vertices for a triangle: top-center, bottom-left, bottom-right.
 */
export function getTriangleVertices(
  x: number,
  y: number,
  w: number,
  h: number
): { x: number; y: number }[] {
  return [
    { x: x + w / 2, y },
    { x, y: y + h },
    { x: x + w, y: y + h },
  ];
}

/**
 * Returns 10 vertices for a 5-pointed star, alternating outer and inner.
 * Inner radius = outer * 0.382.
 */
export function getStarVertices(
  x: number,
  y: number,
  w: number,
  h: number
): { x: number; y: number }[] {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const outerRx = w / 2;
  const outerRy = h / 2;
  const innerRx = outerRx * 0.382;
  const innerRy = outerRy * 0.382;
  const vertices: { x: number; y: number }[] = [];
  const startAngle = -Math.PI / 2; // Start at top

  for (let i = 0; i < 10; i++) {
    const angle = startAngle + (i * Math.PI) / 5;
    const isOuter = i % 2 === 0;
    const rx = isOuter ? outerRx : innerRx;
    const ry = isOuter ? outerRy : innerRy;
    vertices.push({
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
    });
  }

  return vertices;
}

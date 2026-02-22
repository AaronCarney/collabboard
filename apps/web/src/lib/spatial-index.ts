/**
 * Grid-based spatial index for O(1) viewport queries.
 * Objects are inserted into cells based on their bounding box.
 * Query returns all objects whose bounding box overlaps the viewport.
 */

interface Bounded {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const LINE_PADDING = 5;

interface BoundsResult {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Compute correct AABB for objects including lines and connectors. */
export function getObjectBounds(
  obj: Bounded & { type?: string; properties?: unknown }
): BoundsResult {
  if (obj.type === "line" && obj.properties !== null && typeof obj.properties === "object") {
    const props = obj.properties as Record<string, unknown>;
    const x2 = typeof props.x2 === "number" ? props.x2 : obj.x;
    const y2 = typeof props.y2 === "number" ? props.y2 : obj.y;
    const minX = Math.min(obj.x, x2) - LINE_PADDING;
    const minY = Math.min(obj.y, y2) - LINE_PADDING;
    const maxX = Math.max(obj.x, x2) + LINE_PADDING;
    const maxY = Math.max(obj.y, y2) + LINE_PADDING;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  if (obj.type === "connector") {
    return { x: -1e6, y: -1e6, width: 2e6, height: 2e6 };
  }

  return { x: obj.x, y: obj.y, width: obj.width, height: obj.height };
}

export class SpatialIndex<T extends Bounded> {
  private cells = new Map<string, T[]>();
  private cellSize: number;

  constructor(cellSize = 200) {
    this.cellSize = cellSize;
  }

  private cellKey(cx: number, cy: number): string {
    return `${String(cx)},${String(cy)}`;
  }

  insert(obj: T): void {
    const bounds = getObjectBounds(obj);
    const minCx = Math.floor(bounds.x / this.cellSize);
    const minCy = Math.floor(bounds.y / this.cellSize);
    const maxCx = Math.floor((bounds.x + bounds.width) / this.cellSize);
    const maxCy = Math.floor((bounds.y + bounds.height) / this.cellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = this.cellKey(cx, cy);
        let cell = this.cells.get(key);
        if (!cell) {
          cell = [];
          this.cells.set(key, cell);
        }
        cell.push(obj);
      }
    }
  }

  bulkInsert(objects: T[]): void {
    for (const obj of objects) {
      this.insert(obj);
    }
  }

  query(left: number, top: number, right: number, bottom: number): T[] {
    const minCx = Math.floor(left / this.cellSize);
    const minCy = Math.floor(top / this.cellSize);
    const maxCx = Math.floor(right / this.cellSize);
    const maxCy = Math.floor(bottom / this.cellSize);

    const seen = new Set<string>();
    const result: T[] = [];

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const cell = this.cells.get(this.cellKey(cx, cy));
        if (!cell) continue;
        for (const obj of cell) {
          if (seen.has(obj.id)) continue;
          seen.add(obj.id);
          // AABB overlap check
          if (
            obj.x + obj.width >= left &&
            obj.x <= right &&
            obj.y + obj.height >= top &&
            obj.y <= bottom
          ) {
            result.push(obj);
          }
        }
      }
    }

    return result;
  }

  clear(): void {
    this.cells.clear();
  }
}

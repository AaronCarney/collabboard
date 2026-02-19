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
    const minCx = Math.floor(obj.x / this.cellSize);
    const minCy = Math.floor(obj.y / this.cellSize);
    const maxCx = Math.floor((obj.x + obj.width) / this.cellSize);
    const maxCy = Math.floor((obj.y + obj.height) / this.cellSize);

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

import type { BoardObject } from "@collabboard/shared";

/** Shape renderer interface — each object type implements this. */
export interface ShapeRenderer<T extends BoardObject = BoardObject> {
  /** Draw the object onto the canvas at world coordinates. */
  draw(ctx: CanvasRenderingContext2D, obj: T, isSelected: boolean): void;
  /** Return true if world-space point (wx, wy) is inside the object. */
  hitTest(obj: T, wx: number, wy: number): boolean;
  /** Return the axis-aligned bounding box in world coordinates. */
  getBounds(obj: T): { x: number; y: number; width: number; height: number };
  /** Return resize handle positions for the selection overlay. */
  getResizeHandles(obj: T): { id: string; x: number; y: number; cursor: string }[];
}

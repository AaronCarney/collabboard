import type { BoardObject } from "@collabboard/shared";

/** Context passed to renderers that need access to other objects (e.g. connectors). */
export interface RenderContext {
  objectResolver: (id: string) => BoardObject | null;
}

/** Shape renderer interface — each object type implements this. */
export interface ShapeRenderer<T extends BoardObject = BoardObject> {
  /** Draw the object onto the canvas at world coordinates. */
  draw(
    ctx: CanvasRenderingContext2D,
    obj: T,
    isSelected: boolean,
    renderContext?: RenderContext
  ): void;
  /** Return true if world-space point (wx, wy) is inside the object. */
  hitTest(obj: T, wx: number, wy: number, renderContext?: RenderContext): boolean;
  /** Return the axis-aligned bounding box in world coordinates. */
  getBounds(
    obj: T,
    renderContext?: RenderContext
  ): { x: number; y: number; width: number; height: number };
  /** Return resize handle positions for the selection overlay. */
  getResizeHandles(obj: T): { id: string; x: number; y: number; cursor: string }[];
}

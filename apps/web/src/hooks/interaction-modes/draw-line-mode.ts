import type { InteractionMode, InteractionContext, CanvasMouseEvent } from "../interaction-types";

/**
 * Interaction mode for drawing lines.
 * Sets crosshair cursor; actual line creation is handled by BoardCanvas
 * via the onCanvasClick callback (same pattern as draw-shape-mode).
 */
export const drawLineMode: InteractionMode = {
  cursor: "crosshair",

  onMouseDown(_ctx: InteractionContext, _e: CanvasMouseEvent): void {
    // Line creation handled by BoardCanvas via onCanvasClick
  },

  onMouseMove(_ctx: InteractionContext, _e: CanvasMouseEvent): void {
    // Future: preview line while dragging
  },

  onMouseUp(_ctx: InteractionContext, _e: CanvasMouseEvent): void {
    // Line finalization handled by BoardCanvas
  },
};

import type { InteractionMode, InteractionContext, CanvasPointerEvent } from "../interaction-types";

/**
 * Interaction mode for drawing lines.
 * Sets crosshair cursor; actual line creation is handled by BoardCanvas
 * via the onCanvasClick callback (same pattern as draw-shape-mode).
 */
export const drawLineMode: InteractionMode = {
  cursor: "crosshair",

  onPointerDown(_ctx: InteractionContext, _e: CanvasPointerEvent): void {
    // Line creation handled by BoardCanvas via onCanvasClick
  },

  onPointerMove(_ctx: InteractionContext, _e: CanvasPointerEvent): void {
    // Future: preview line while dragging
  },

  onPointerUp(_ctx: InteractionContext, _e: CanvasPointerEvent): void {
    // Line finalization handled by BoardCanvas
  },
};

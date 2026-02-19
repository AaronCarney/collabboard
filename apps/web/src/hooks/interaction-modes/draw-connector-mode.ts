import type { InteractionMode, InteractionContext, CanvasMouseEvent } from "../interaction-types";

/**
 * Interaction mode for drawing connectors between objects.
 * Sets crosshair cursor; actual connector creation is handled by BoardCanvas
 * via the onCanvasClick callback (same pattern as draw-shape-mode).
 *
 * Future enhancement: click source object → ghost line → click target object.
 */
export const drawConnectorMode: InteractionMode = {
  cursor: "crosshair",

  onMouseDown(_ctx: InteractionContext, _e: CanvasMouseEvent): void {
    // Connector creation handled by BoardCanvas
  },

  onMouseMove(_ctx: InteractionContext, _e: CanvasMouseEvent): void {
    // Future: preview connector line while dragging
  },

  onMouseUp(_ctx: InteractionContext, _e: CanvasMouseEvent): void {
    // Connector finalization handled by BoardCanvas
  },
};

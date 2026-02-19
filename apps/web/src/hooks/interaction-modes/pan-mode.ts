import type { InteractionMode, InteractionContext, CanvasMouseEvent } from "../interaction-types";

/** Pan mode: drag to pan the camera. Actual camera mutation handled by BoardCanvas. */
export const panMode: InteractionMode = {
  cursor: "grab",

  onMouseDown(_ctx: InteractionContext, _e: CanvasMouseEvent): void {
    // Pan start tracked by BoardCanvas
  },

  onMouseMove(_ctx: InteractionContext, _e: CanvasMouseEvent): void {
    // Pan delta tracked by BoardCanvas
  },

  onMouseUp(_ctx: InteractionContext, _e: CanvasMouseEvent): void {
    // Pan end tracked by BoardCanvas
  },
};

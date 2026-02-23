import type { InteractionMode, InteractionContext, CanvasPointerEvent } from "../interaction-types";

/** Pan mode: drag to pan the camera. Actual camera mutation handled by BoardCanvas. */
export const panMode: InteractionMode = {
  cursor: "grab",

  onPointerDown(_ctx: InteractionContext, _e: CanvasPointerEvent): void {
    // Pan start tracked by BoardCanvas
  },

  onPointerMove(_ctx: InteractionContext, _e: CanvasPointerEvent): void {
    // Pan delta tracked by BoardCanvas
  },

  onPointerUp(_ctx: InteractionContext, _e: CanvasPointerEvent): void {
    // Pan end tracked by BoardCanvas
  },
};

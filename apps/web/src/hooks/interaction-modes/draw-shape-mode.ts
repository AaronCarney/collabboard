import type { ObjectType } from "@collabboard/shared";
import type { InteractionMode, InteractionContext, CanvasPointerEvent } from "../interaction-types";

/** Factory: creates an interaction mode for drawing a specific shape type. */
export function drawShapeMode(shapeType: ObjectType): InteractionMode {
  return {
    cursor: "crosshair",

    onPointerDown(_ctx: InteractionContext, _e: CanvasPointerEvent): void {
      // Shape creation is handled by BoardCanvas via onCanvasClick callback.
      // This mode just sets the cursor and lets the existing creation flow work.
      void shapeType; // used by the factory closure
    },

    onPointerMove(_ctx: InteractionContext, _e: CanvasPointerEvent): void {
      // No preview rendering during shape draw (future enhancement)
    },

    onPointerUp(_ctx: InteractionContext, _e: CanvasPointerEvent): void {
      // Shape finalization handled by BoardCanvas
    },
  };
}

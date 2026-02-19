import type { ObjectType } from "@collabboard/shared";
import type { InteractionMode, InteractionContext, CanvasMouseEvent } from "../interaction-types";

/** Factory: creates an interaction mode for drawing a specific shape type. */
export function drawShapeMode(shapeType: ObjectType): InteractionMode {
  return {
    cursor: "crosshair",

    onMouseDown(_ctx: InteractionContext, _e: CanvasMouseEvent): void {
      // Shape creation is handled by BoardCanvas via onCanvasClick callback.
      // This mode just sets the cursor and lets the existing creation flow work.
      void shapeType; // used by the factory closure
    },

    onMouseMove(_ctx: InteractionContext, _e: CanvasMouseEvent): void {
      // No preview rendering during shape draw (future enhancement)
    },

    onMouseUp(_ctx: InteractionContext, _e: CanvasMouseEvent): void {
      // Shape finalization handled by BoardCanvas
    },
  };
}

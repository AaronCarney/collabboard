import { useMemo } from "react";
import type { ToolType } from "@collabboard/shared";
import type { InteractionMode } from "./interaction-types";
import { selectMode, panMode, drawShapeMode } from "./interaction-modes";

/** Returns the active InteractionMode for the given tool. */
export function useCanvasInteraction(activeTool: ToolType): InteractionMode {
  return useMemo(() => {
    switch (activeTool) {
      case "select":
        return selectMode;
      case "pan":
        return panMode;
      default:
        // All other tools are shape creation tools
        return drawShapeMode(activeTool);
    }
  }, [activeTool]);
}

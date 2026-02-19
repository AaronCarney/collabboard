import type { InteractionMode, InteractionContext, CanvasMouseEvent } from "../interaction-types";

/** Select mode: click to select objects, drag to move them. */
export const selectMode: InteractionMode = {
  cursor: "default",

  onMouseDown(ctx: InteractionContext, e: CanvasMouseEvent): void {
    // Hit test all objects in reverse order (topmost first)
    let hitObj = null;
    for (const [, obj] of ctx.objects) {
      const renderer = ctx.getRenderer(obj.type);
      if (renderer.hitTest(obj, e.worldX, e.worldY)) {
        hitObj = obj;
      }
    }

    if (hitObj) {
      if (e.shiftKey) {
        // Toggle selection
        const newSelection = new Set(ctx.selectedIds);
        if (newSelection.has(hitObj.id)) {
          newSelection.delete(hitObj.id);
        } else {
          newSelection.add(hitObj.id);
        }
        ctx.selectObjects(newSelection);
      } else {
        // Single select (unless already selected)
        if (!ctx.selectedIds.has(hitObj.id)) {
          ctx.selectObjects(new Set([hitObj.id]));
        }
      }
    } else {
      // Click empty space: deselect all
      ctx.selectObjects(new Set());
    }
  },

  onMouseMove(_ctx: InteractionContext, _e: CanvasMouseEvent): void {
    // Drag logic is handled at a higher level (BoardCanvas)
  },

  onMouseUp(_ctx: InteractionContext, _e: CanvasMouseEvent): void {
    // Release logic is handled at a higher level
  },
};

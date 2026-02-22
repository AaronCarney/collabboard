import type { BoardObject } from "@collabboard/shared";
import type { ShapeRenderer } from "./types";
import { getStandardResizeHandles, aabbGetBounds } from "./render-utils";
import { pointInPolygon, getTriangleVertices } from "../../../lib/geometry-utils";

export const triangleRenderer: ShapeRenderer = {
  draw(ctx: CanvasRenderingContext2D, obj: BoardObject, isSelected: boolean): void {
    const verts = getTriangleVertices(obj.x, obj.y, obj.width, obj.height);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(verts[0].x, verts[0].y);
    ctx.lineTo(verts[1].x, verts[1].y);
    ctx.lineTo(verts[2].x, verts[2].y);
    ctx.closePath();
    ctx.fillStyle = obj.color;
    ctx.fill();
    if (isSelected) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
  },

  hitTest(obj: BoardObject, wx: number, wy: number): boolean {
    const verts = getTriangleVertices(obj.x, obj.y, obj.width, obj.height);
    return pointInPolygon(wx, wy, verts);
  },

  getBounds(obj: BoardObject): { x: number; y: number; width: number; height: number } {
    return aabbGetBounds(obj);
  },

  getResizeHandles(obj: BoardObject): { id: string; x: number; y: number; cursor: string }[] {
    return getStandardResizeHandles(obj);
  },
};

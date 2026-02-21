import type { BoardObject } from "@collabboard/shared";

export interface BoardBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const PADDING = 40;

/** Compute the bounding box that covers all objects, with padding. */
export function computeBoardBounds(objects: BoardObject[]): BoardBounds {
  if (objects.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const obj of objects) {
    minX = Math.min(minX, obj.x);
    minY = Math.min(minY, obj.y);
    maxX = Math.max(maxX, obj.x + obj.width);
    maxY = Math.max(maxY, obj.y + obj.height);
  }

  return {
    x: minX - PADDING,
    y: minY - PADDING,
    width: maxX - minX + PADDING * 2,
    height: maxY - minY + PADDING * 2,
  };
}

/** Export the board as a PNG file download. */
export function exportBoardAsPng(objects: BoardObject[], boardName: string): void {
  if (objects.length === 0) return;

  const bounds = computeBoardBounds(objects);
  const canvas = document.createElement("canvas");
  canvas.width = bounds.width;
  canvas.height = bounds.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, bounds.width, bounds.height);

  // Translate so objects render at correct positions
  ctx.save();
  ctx.translate(-bounds.x, -bounds.y);

  for (const obj of objects) {
    ctx.save();
    // Apply opacity
    ctx.globalAlpha = obj.opacity ?? 1;

    if (obj.type === "connector") {
      // Skip connectors for now (they reference other objects)
      ctx.restore();
      continue;
    }

    // Fill background
    ctx.fillStyle = obj.color;
    ctx.fillRect(obj.x, obj.y, obj.width, obj.height);

    // Draw border
    ctx.strokeStyle = "#00000033";
    ctx.lineWidth = 1;
    ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);

    // Draw text content if present
    if (obj.content) {
      ctx.fillStyle = "#333333";
      ctx.font = `${String(obj.fontSize ?? 16)}px ${obj.fontFamily ?? "sans-serif"}`;
      ctx.textBaseline = "top";
      const padding = 8;
      ctx.fillText(obj.content, obj.x + padding, obj.y + padding, obj.width - padding * 2);
    }

    ctx.restore();
  }

  ctx.restore();

  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${boardName}.png`;
  link.click();
}

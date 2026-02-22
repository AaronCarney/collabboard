import type { BoardObject } from "@collabboard/shared";

/** Standard 8 resize handle positions for axis-aligned bounding boxes. */
export function getStandardResizeHandles(
  obj: BoardObject
): { id: string; x: number; y: number; cursor: string }[] {
  const { x, y, width, height } = obj;
  const mx = x + width / 2;
  const my = y + height / 2;

  return [
    { id: "nw", x, y, cursor: "nwse-resize" },
    { id: "n", x: mx, y, cursor: "ns-resize" },
    { id: "ne", x: x + width, y, cursor: "nesw-resize" },
    { id: "e", x: x + width, y: my, cursor: "ew-resize" },
    { id: "se", x: x + width, y: y + height, cursor: "nwse-resize" },
    { id: "s", x: mx, y: y + height, cursor: "ns-resize" },
    { id: "sw", x, y: y + height, cursor: "nesw-resize" },
    { id: "w", x, y: my, cursor: "ew-resize" },
  ];
}

/** Standard AABB hit test. */
export function aabbHitTest(obj: BoardObject, wx: number, wy: number): boolean {
  return wx >= obj.x && wx <= obj.x + obj.width && wy >= obj.y && wy <= obj.y + obj.height;
}

/** Standard AABB bounding box. */
export function aabbGetBounds(obj: BoardObject): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  return { x: obj.x, y: obj.y, width: obj.width, height: obj.height };
}

/** Draw a rounded rectangle path (does not fill or stroke). */
export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Word-wrap text into a constrained width, respecting explicit newlines. */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): void {
  const paragraphs = text.split("\n");
  let currentY = y;

  for (const paragraph of paragraphs) {
    const words = paragraph.split(" ");
    let line = "";

    for (const word of words) {
      const testLine = line + word + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line) {
        ctx.fillText(line.trim(), x, currentY);
        line = word + " ";
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, currentY);
    currentY += lineHeight;
  }
}

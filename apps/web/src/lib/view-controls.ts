interface FittableObject {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FitCamera {
  x: number;
  y: number;
  zoom: number;
}

const DEFAULT_PADDING = 50;
const DEFAULT_CAMERA: FitCamera = { x: 0, y: 0, zoom: 1 };

/**
 * Computes a camera position that fits all objects in the viewport.
 * Returns default camera if objects array is empty or viewport has zero dimensions.
 * Zoom is capped at 1.0 (never zooms in past 100%).
 */
export function computeFitToScreen(
  objects: FittableObject[],
  viewportWidth: number,
  viewportHeight: number,
  padding?: number
): FitCamera {
  if (objects.length === 0 || viewportWidth <= 0 || viewportHeight <= 0) {
    return { ...DEFAULT_CAMERA };
  }

  const pad = padding ?? DEFAULT_PADDING;

  // Compute bounding box
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const obj of objects) {
    if (obj.x < minX) minX = obj.x;
    if (obj.y < minY) minY = obj.y;
    const right = obj.x + obj.width;
    const bottom = obj.y + obj.height;
    if (right > maxX) maxX = right;
    if (bottom > maxY) maxY = bottom;
  }

  const bbWidth = maxX - minX;
  const bbHeight = maxY - minY;

  // Available viewport space after padding
  const availableW = viewportWidth - pad * 2;
  const availableH = viewportHeight - pad * 2;

  if (availableW <= 0 || availableH <= 0) {
    return { ...DEFAULT_CAMERA };
  }

  // Compute zoom to fit bounding box, cap at 1.0
  let zoom: number;
  if (bbWidth <= 0 && bbHeight <= 0) {
    zoom = 1;
  } else if (bbWidth <= 0) {
    zoom = Math.min(availableH / bbHeight, 1);
  } else if (bbHeight <= 0) {
    zoom = Math.min(availableW / bbWidth, 1);
  } else {
    zoom = Math.min(availableW / bbWidth, availableH / bbHeight, 1);
  }

  // Center bounding box in viewport
  const bbCenterX = minX + bbWidth / 2;
  const bbCenterY = minY + bbHeight / 2;

  const x = viewportWidth / 2 - bbCenterX * zoom;
  const y = viewportHeight / 2 - bbCenterY * zoom;

  return { x, y, zoom };
}

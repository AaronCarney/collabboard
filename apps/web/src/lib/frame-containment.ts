import type { BoardObject } from "@collabboard/shared";

/**
 * Check if a child object's center is inside a frame's bounds.
 */
export function isInsideFrame(child: BoardObject, frame: BoardObject): boolean {
  const centerX = child.x + child.width / 2;
  const centerY = child.y + child.height / 2;

  return (
    centerX >= frame.x &&
    centerX <= frame.x + frame.width &&
    centerY >= frame.y &&
    centerY <= frame.y + frame.height
  );
}

/**
 * Get all children of a frame (objects whose parent_frame_id matches).
 * Excludes frames themselves to prevent self-referencing issues.
 */
export function getChildrenOfFrame(frameId: string, objects: BoardObject[]): BoardObject[] {
  return objects.filter((obj) => obj.parent_frame_id === frameId && obj.id !== frameId);
}

/**
 * Find the first frame that contains the given object (by center point).
 * Excludes the object itself (a frame cannot contain itself).
 */
export function findContainingFrame(obj: BoardObject, objects: BoardObject[]): BoardObject | null {
  for (const candidate of objects) {
    if (candidate.type !== "frame") continue;
    if (candidate.id === obj.id) continue;
    if (isInsideFrame(obj, candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Apply a position delta to all children of a frame.
 * Returns the updated child objects with incremented versions.
 */
export function applyFrameMove(
  frameId: string,
  dx: number,
  dy: number,
  objects: BoardObject[]
): BoardObject[] {
  const children = getChildrenOfFrame(frameId, objects);
  return children.map((child) => ({
    ...child,
    x: child.x + dx,
    y: child.y + dy,
    version: child.version + 1,
    updated_at: new Date().toISOString(),
  }));
}

/**
 * Set parent_frame_id to null for all children of a deleted frame.
 * Returns the updated child objects.
 */
export function nullifyChildrenFrameId(frameId: string, objects: BoardObject[]): BoardObject[] {
  const children = getChildrenOfFrame(frameId, objects);
  return children.map((child) => ({
    ...child,
    parent_frame_id: null,
  }));
}

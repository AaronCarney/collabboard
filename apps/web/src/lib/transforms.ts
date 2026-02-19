import type { BoardObject } from "@collabboard/shared";
import type { MutationPipeline, UndoableCommand } from "./board-commands";
import { v4 as uuidv4 } from "uuid";

const DUPLICATE_OFFSET = 20;
const ROTATION_HANDLE_DISTANCE = 30;

/** Convert degrees to radians. */
export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Returns the position of the rotation handle for an object.
 * The handle sits ROTATION_HANDLE_DISTANCE pixels above the
 * top-center of the object, rotated by the object's rotation.
 */
export function getRotationHandlePosition(obj: {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}): { x: number; y: number } {
  const cx = obj.x + obj.width / 2;
  const cy = obj.y + obj.height / 2;
  // Unrotated handle position: top-center, offset above by ROTATION_HANDLE_DISTANCE
  const handleOffsetX = 0;
  const handleOffsetY = -(obj.height / 2 + ROTATION_HANDLE_DISTANCE);
  // Rotate around center
  const rad = degreesToRadians(obj.rotation);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: cx + handleOffsetX * cos - handleOffsetY * sin,
    y: cy + handleOffsetX * sin + handleOffsetY * cos,
  };
}

/** Serialize objects to a JSON string for clipboard. */
export function serializeObjectsToClipboard(objects: BoardObject[]): string {
  return JSON.stringify(objects);
}

/** Deserialize a clipboard JSON string back to objects. Returns [] on invalid input. */
export function deserializeClipboard(json: string): BoardObject[] {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed as BoardObject[];
  } catch {
    return [];
  }
}

/**
 * Create duplicates of objects with new IDs and offset positions.
 * @param objects Source objects to duplicate
 * @param offset Pixel offset for x and y (default: 20)
 */
export function createDuplicates(objects: BoardObject[], offset = DUPLICATE_OFFSET): BoardObject[] {
  return objects.map((obj) => ({
    ...obj,
    id: uuidv4(),
    x: obj.x + offset,
    y: obj.y + offset,
    version: 1,
  }));
}

/** UndoableCommand that inserts objects (for paste). */
export function createPasteCommand(
  objects: BoardObject[],
  pipeline: MutationPipeline
): UndoableCommand {
  const ids = objects.map((o) => o.id);
  const count = objects.length;
  return {
    description: count === 1 ? "Paste object" : `Paste ${String(count)} objects`,
    execute() {
      pipeline.upsertObjects(objects);
    },
    undo() {
      pipeline.removeObjects(ids);
    },
  };
}

export interface DuplicateCommand extends UndoableCommand {
  createdIds: string[];
}

/** UndoableCommand that duplicates existing objects by ID. */
export function createDuplicateCommand(
  sourceIds: string[],
  pipeline: MutationPipeline
): DuplicateCommand {
  let duplicates: BoardObject[] = [];

  const cmd: DuplicateCommand = {
    description:
      sourceIds.length === 1 ? "Duplicate object" : `Duplicate ${String(sourceIds.length)} objects`,
    createdIds: [],
    execute() {
      if (duplicates.length === 0) {
        // First execution — resolve source objects and create duplicates
        const sources = sourceIds
          .map((id) => pipeline.getObject(id))
          .filter((o): o is BoardObject => o !== null);
        duplicates = createDuplicates(sources);
        cmd.createdIds = duplicates.map((d) => d.id);
      }
      if (duplicates.length > 0) {
        pipeline.upsertObjects(duplicates);
      }
    },
    undo() {
      if (duplicates.length > 0) {
        pipeline.removeObjects(duplicates.map((d) => d.id));
      }
    },
  };
  return cmd;
}

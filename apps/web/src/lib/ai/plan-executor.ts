import { v4 as uuidv4 } from "uuid";
import type {
  BoardObject,
  StickyNoteObject,
  RectangleObject,
  CircleObject,
  TextObject,
  FrameObject,
  ConnectorObject,
  ObjectType,
} from "@collabboard/shared";
import { OBJECT_DEFAULTS } from "@collabboard/shared";
import type { Plan, PlanObject, Modification } from "./plan-schema";
import { resolveColor } from "./colors";
import { resolveOverlaps } from "./collision";

export interface PlanExecutionResult {
  objects: BoardObject[];
  deletedIds: string[];
  modifiedObjects: BoardObject[];
}

function makeTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Get the default width for an object type.
 */
function defaultWidth(type: ObjectType): number {
  const defaults = OBJECT_DEFAULTS[type];
  return defaults.width ?? 200;
}

/**
 * Get the default height for an object type.
 */
function defaultHeight(type: ObjectType): number {
  const defaults = OBJECT_DEFAULTS[type];
  return defaults.height ?? 200;
}

/**
 * Convert a PlanObject (from AI output) into a BoardObject.
 */
function planObjectToBoardObject(obj: PlanObject, boardId: string, userId: string): BoardObject {
  const ts = makeTimestamp();
  const id = uuidv4();
  const objType = obj.type;

  // Base fields shared by all object types
  const base = {
    id,
    board_id: boardId,
    x: obj.x,
    y: obj.y,
    width: obj.width ?? defaultWidth(objType),
    height: obj.height ?? defaultHeight(objType),
    rotation: 0,
    content: obj.content ?? "",
    color: resolveColor(obj.color ?? undefined, objType),
    version: 1,
    created_by: userId,
    created_at: ts,
    updated_at: ts,
    parent_frame_id: obj.parentFrameId ?? null,
  };

  if (objType === "connector") {
    const style = obj.connectorStyle ?? "arrow";
    const arrowStyle = style === "line" ? "none" : "end";
    const strokeStyle = style === "dashed" ? "dashed" : "solid";

    const connectorObj: ConnectorObject = {
      ...base,
      type: "connector",
      properties: {
        from_object_id: obj.fromObjectId ?? "",
        to_object_id: obj.toObjectId ?? "",
        from_port: "center",
        to_port: "center",
        arrow_style: arrowStyle,
        stroke_style: strokeStyle,
      },
    };
    return connectorObj;
  }

  // For non-connector types, properties is an empty record
  const emptyProps: Record<string, never> = {};

  switch (objType) {
    case "sticky_note": {
      const stickyObj: StickyNoteObject = {
        ...base,
        type: "sticky_note",
        properties: emptyProps,
      };
      return stickyObj;
    }
    case "rectangle": {
      const rectObj: RectangleObject = {
        ...base,
        type: "rectangle",
        properties: emptyProps,
      };
      return rectObj;
    }
    case "circle": {
      const circleObj: CircleObject = {
        ...base,
        type: "circle",
        properties: emptyProps,
      };
      return circleObj;
    }
    case "text": {
      const textObj: TextObject = {
        ...base,
        type: "text",
        properties: emptyProps,
      };
      return textObj;
    }
    case "frame": {
      const frameObj: FrameObject = {
        ...base,
        type: "frame",
        properties: emptyProps,
      };
      return frameObj;
    }
    default: {
      // Fallback: treat as sticky_note
      const fallbackObj: StickyNoteObject = {
        ...base,
        type: "sticky_note",
        properties: emptyProps,
      };
      return fallbackObj;
    }
  }
}

/**
 * Apply a modification to an existing board object.
 * Returns the modified object or null if not found.
 */
function applyModification(
  mod: Modification,
  existingObjects: BoardObject[]
): { modified: BoardObject | null; deleted: boolean } {
  const target = existingObjects.find((o) => o.id === mod.objectId);
  if (!target) {
    return { modified: null, deleted: false };
  }

  if (mod.action === "delete") {
    return { modified: null, deleted: true };
  }

  const updated = { ...target };
  updated.version = target.version + 1;
  updated.updated_at = makeTimestamp();

  switch (mod.action) {
    case "move":
      if (mod.x != null) {
        updated.x = mod.x;
      }
      if (mod.y != null) {
        updated.y = mod.y;
      }
      break;
    case "resize":
      if (mod.width != null) {
        updated.width = mod.width;
      }
      if (mod.height != null) {
        updated.height = mod.height;
      }
      break;
    case "recolor":
      if (mod.color != null) {
        updated.color = resolveColor(mod.color, target.type);
      }
      break;
    case "update_text":
      if (mod.text != null) {
        updated.content = mod.text;
      }
      break;
  }

  return { modified: updated, deleted: false };
}

/**
 * Execute a validated plan synchronously, converting it into BoardObjects.
 *
 * This function does NO I/O. It transforms the plan into concrete objects
 * and applies collision resolution against existing board state.
 */
export function executePlan(
  plan: Plan,
  boardId: string,
  userId: string,
  existingObjects: BoardObject[]
): PlanExecutionResult {
  // Create new objects from plan
  const newObjects = plan.objects.map((obj) => planObjectToBoardObject(obj, boardId, userId));

  // Apply modifications to existing objects
  const deletedIds: string[] = [];
  const modifiedObjects: BoardObject[] = [];

  if (plan.modifications) {
    for (const mod of plan.modifications) {
      const result = applyModification(mod, existingObjects);
      if (result.deleted) {
        deletedIds.push(mod.objectId);
      } else if (result.modified) {
        modifiedObjects.push(result.modified);
      }
    }
  }

  // Resolve collisions among new objects against existing board state
  const resolvedNew = resolveOverlaps(newObjects, existingObjects);

  return {
    objects: resolvedNew,
    deletedIds,
    modifiedObjects,
  };
}

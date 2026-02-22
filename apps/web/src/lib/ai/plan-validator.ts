import type { BoardObject } from "@collabboard/shared";
import type { Plan, PlanObject, Modification } from "./plan-schema";

const MIN_DIMENSION = 10;
const MAX_DIMENSION = 5000;
const MIN_POSITION = -50000;
const MAX_POSITION = 50000;

export interface PlanValidationResult {
  valid: boolean;
  errors: string[];
  corrected: Plan;
}

/**
 * Clamp a numeric value to the specified range.
 */
function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Validate a single plan object, clamping out-of-range values
 * and recording any errors for invalid references.
 */
function validatePlanObject(
  obj: PlanObject,
  errors: string[],
  existingIds: Set<string>
): PlanObject {
  const corrected = { ...obj };

  // Clamp positions
  corrected.x = clamp(corrected.x, MIN_POSITION, MAX_POSITION);
  corrected.y = clamp(corrected.y, MIN_POSITION, MAX_POSITION);

  // Clamp dimensions if provided
  if (corrected.width !== undefined) {
    corrected.width = clamp(corrected.width, MIN_DIMENSION, MAX_DIMENSION);
  }
  if (corrected.height !== undefined) {
    corrected.height = clamp(corrected.height, MIN_DIMENSION, MAX_DIMENSION);
  }

  // Validate connector references
  if (corrected.type === "connector") {
    if (corrected.fromObjectId && !existingIds.has(corrected.fromObjectId)) {
      errors.push(`Connector fromObjectId ${corrected.fromObjectId} not found`);
    }
    if (corrected.toObjectId && !existingIds.has(corrected.toObjectId)) {
      errors.push(`Connector toObjectId ${corrected.toObjectId} not found`);
    }
  }

  // Validate parent frame reference
  if (corrected.parentFrameId && !existingIds.has(corrected.parentFrameId)) {
    errors.push(`parentFrameId ${corrected.parentFrameId} not found`);
    corrected.parentFrameId = null;
  }

  return corrected;
}

/**
 * Validate a single modification, checking that the target object exists.
 */
function validateModification(
  mod: Modification,
  errors: string[],
  existingIds: Set<string>
): Modification | null {
  if (!existingIds.has(mod.objectId)) {
    errors.push(`Modification target ${mod.objectId} not found`);
    return null;
  }

  const corrected = { ...mod };

  // Clamp positions for move
  if (corrected.action === "move") {
    if (corrected.x !== undefined) {
      corrected.x = clamp(corrected.x, MIN_POSITION, MAX_POSITION);
    }
    if (corrected.y !== undefined) {
      corrected.y = clamp(corrected.y, MIN_POSITION, MAX_POSITION);
    }
  }

  // Clamp dimensions for resize
  if (corrected.action === "resize") {
    if (corrected.width !== undefined) {
      corrected.width = clamp(corrected.width, MIN_DIMENSION, MAX_DIMENSION);
    }
    if (corrected.height !== undefined) {
      corrected.height = clamp(corrected.height, MIN_DIMENSION, MAX_DIMENSION);
    }
  }

  return corrected;
}

/**
 * Validate a plan against the current board state.
 * Returns a corrected plan with clamped values and filtered invalid modifications.
 * The `valid` field is false only if there are hard errors (not just clamping).
 */
export function validatePlan(plan: Plan, existingObjects: BoardObject[]): PlanValidationResult {
  const errors: string[] = [];
  const existingIds = new Set(existingObjects.map((o) => o.id));

  // Validate and correct each new object
  const correctedObjects = plan.objects.map((obj) => validatePlanObject(obj, errors, existingIds));

  // Validate and correct each modification
  const correctedModifications: Modification[] = [];
  if (plan.modifications) {
    for (const mod of plan.modifications) {
      const corrected = validateModification(mod, errors, existingIds);
      if (corrected) {
        correctedModifications.push(corrected);
      }
    }
  }

  const corrected: Plan = {
    objects: correctedObjects,
    modifications: correctedModifications.length > 0 ? correctedModifications : undefined,
    message: plan.message,
  };

  // Plan is considered valid if there are no connector reference errors
  // and no total-failure scenarios. Clamping is silent correction.
  const hasHardErrors = errors.some((e) => e.includes("not found") && !e.includes("parentFrameId"));

  return {
    valid: !hasHardErrors,
    errors,
    corrected,
  };
}

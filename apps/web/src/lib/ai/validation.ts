import type { BoardObject } from "@collabboard/shared";

export interface ValidationResult {
  valid: boolean;
  clamped: string[];
  error?: string;
}

const MIN_DIMENSION = 10;
const MAX_DIMENSION = 5000;
export const MIN_POSITION = -50000;
export const MAX_POSITION = 50000;

function clampAndTrack(
  args: Record<string, unknown>,
  field: string,
  min: number,
  max: number,
  clamped: string[]
): void {
  const raw = args[field];
  if (raw === undefined) return;

  let val: number;
  if (typeof raw === "string") {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    val = parsed;
    args[field] = val;
    clamped.push(field);
  } else if (typeof raw === "number" && Number.isFinite(raw)) {
    val = raw;
  } else {
    return;
  }

  if (val < min) {
    args[field] = min;
    if (!clamped.includes(field)) {
      clamped.push(field);
    }
  } else if (val > max) {
    args[field] = max;
    if (!clamped.includes(field)) {
      clamped.push(field);
    }
  }
}

/**
 * Validates and sanitizes tool call arguments before execution.
 *
 * WARNING: This function mutates `args` in place. Numeric fields (x, y, width, height)
 * are coerced from strings to numbers and clamped to safe ranges. The `clamped` array
 * in the result lists which fields were modified.
 */
export function validateToolCallArgs(
  _toolName: string,
  args: Record<string, unknown>,
  existingObjects: BoardObject[]
): ValidationResult {
  const clamped: string[] = [];

  // Coerce and clamp dimensions
  clampAndTrack(args, "width", MIN_DIMENSION, MAX_DIMENSION, clamped);
  clampAndTrack(args, "height", MIN_DIMENSION, MAX_DIMENSION, clamped);

  // Coerce and clamp positions
  clampAndTrack(args, "x", MIN_POSITION, MAX_POSITION, clamped);
  clampAndTrack(args, "y", MIN_POSITION, MAX_POSITION, clamped);

  // Validate objectId if present
  const objectId = args.objectId;
  if (typeof objectId === "string") {
    const found = existingObjects.some((o) => o.id === objectId);
    if (!found) {
      return { valid: false, clamped, error: `Object ${objectId} not found` };
    }
  }

  return { valid: true, clamped };
}

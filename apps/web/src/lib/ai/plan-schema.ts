import { z } from "@collabboard/shared";

/**
 * Schema for a modification to an existing board object within a plan.
 */
export const ModificationSchema = z.object({
  objectId: z.string().uuid().describe("ID of the existing object to modify"),
  action: z
    .enum(["move", "resize", "recolor", "update_text", "delete"])
    .describe("Type of modification"),
  x: z.number().nullable().describe("New X position (for move)"),
  y: z.number().nullable().describe("New Y position (for move)"),
  width: z.number().nullable().describe("New width (for resize)"),
  height: z.number().nullable().describe("New height (for resize)"),
  color: z.string().nullable().describe("New color (for recolor)"),
  text: z.string().nullable().describe("New text content (for update_text)"),
});

/**
 * Schema for a new object to be created as part of a plan.
 */
export const PlanObjectSchema = z.object({
  type: z
    .enum(["sticky_note", "rectangle", "circle", "text", "frame", "connector"])
    .describe("Type of object to create"),
  x: z.number().describe("X position in world coordinates"),
  y: z.number().describe("Y position in world coordinates"),
  width: z.number().nullable().describe("Width in pixels"),
  height: z.number().nullable().describe("Height in pixels"),
  content: z.string().nullable().describe("Text content"),
  color: z.string().nullable().describe("Color (named or hex)"),
  parentFrameId: z.string().uuid().nullable().describe("Parent frame ID"),
  // Connector-specific fields
  fromObjectId: z.string().uuid().nullable().describe("Source object ID (connectors only)"),
  toObjectId: z.string().uuid().nullable().describe("Target object ID (connectors only)"),
  connectorStyle: z
    .enum(["arrow", "line", "dashed"])
    .nullable()
    .describe("Connector style (connectors only)"),
});

/**
 * Top-level plan schema for structured AI output.
 * The LLM generates a plan of objects to create and modifications to make,
 * which is then validated and executed deterministically.
 */
export const PlanSchema = z.object({
  objects: z.array(PlanObjectSchema).describe("New objects to create on the board"),
  modifications: z
    .array(ModificationSchema)
    .nullable()
    .describe("Modifications to existing objects"),
  message: z.string().describe("One-sentence summary of what was done"),
});

/** Inferred type for a plan modification action. */
export type Modification = z.infer<typeof ModificationSchema>;

/** Inferred type for a new object in the plan. */
export type PlanObject = z.infer<typeof PlanObjectSchema>;

/** Inferred type for the full plan. */
export type Plan = z.infer<typeof PlanSchema>;

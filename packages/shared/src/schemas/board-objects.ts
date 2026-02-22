import { z } from "zod";

const baseObjectSchema = z.object({
  id: z.string().uuid(),
  board_id: z.string().uuid(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number(),
  content: z.string(),
  color: z.string(),
  opacity: z.number().min(0).max(1).optional().default(1),
  fontSize: z.number().int().min(8).max(128).optional().default(16),
  fontFamily: z.string().optional().default("sans-serif"),
  version: z.number().int().nonnegative(),
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  parent_frame_id: z.string().uuid().nullable(),
});

const emptyPropertiesSchema = z.object({}).strict().or(z.record(z.never()));

export const stickyNoteSchema = baseObjectSchema.extend({
  type: z.literal("sticky_note"),
  properties: emptyPropertiesSchema,
});

export const rectangleSchema = baseObjectSchema.extend({
  type: z.literal("rectangle"),
  properties: emptyPropertiesSchema,
});

export const circleSchema = baseObjectSchema.extend({
  type: z.literal("circle"),
  properties: emptyPropertiesSchema,
});

export const textSchema = baseObjectSchema.extend({
  type: z.literal("text"),
  properties: emptyPropertiesSchema,
});

export const linePropertiesSchema = z.object({
  x2: z.number(),
  y2: z.number(),
  arrow_style: z.enum(["none", "end", "both"]),
  stroke_style: z.enum(["solid", "dashed", "dotted"]),
  stroke_width: z.number().positive(),
});

export const lineSchema = baseObjectSchema.extend({
  type: z.literal("line"),
  properties: linePropertiesSchema,
});

export const connectorPropertiesSchema = z.object({
  from_object_id: z.string().uuid(),
  to_object_id: z.string().uuid(),
  from_port: z.enum(["top", "right", "bottom", "left", "center"]),
  to_port: z.enum(["top", "right", "bottom", "left", "center"]),
  arrow_style: z.enum(["none", "end", "both"]),
  stroke_style: z.enum(["solid", "dashed", "dotted"]),
});

export const connectorSchema = baseObjectSchema.extend({
  type: z.literal("connector"),
  properties: connectorPropertiesSchema,
});

export const frameSchema = baseObjectSchema.extend({
  type: z.literal("frame"),
  properties: emptyPropertiesSchema,
});

export const triangleSchema = baseObjectSchema.extend({
  type: z.literal("triangle"),
  properties: emptyPropertiesSchema,
});

export const starSchema = baseObjectSchema.extend({
  type: z.literal("star"),
  properties: emptyPropertiesSchema,
});

export const boardObjectSchema = z.discriminatedUnion("type", [
  stickyNoteSchema,
  rectangleSchema,
  circleSchema,
  textSchema,
  lineSchema,
  connectorSchema,
  frameSchema,
  triangleSchema,
  starSchema,
]);

export type BoardObjectZod = z.infer<typeof boardObjectSchema>;

import { z } from "zod";

export const accessLevelSchema = z.enum(["view", "edit"]);

export const boardShareSchema = z.object({
  id: z.string().uuid(),
  board_id: z.string().uuid(),
  access_level: accessLevelSchema,
  token: z.string().uuid(),
  created_by: z.string(),
  created_at: z.string(),
  expires_at: z.string().nullable(),
});

export const createShareRequestSchema = z.object({
  board_id: z.string().uuid(),
  access_level: accessLevelSchema,
});

export const deleteShareRequestSchema = z.object({
  share_id: z.string().uuid(),
});

export type AccessLevel = z.infer<typeof accessLevelSchema>;
export type BoardShare = z.infer<typeof boardShareSchema>;
export type CreateShareRequest = z.infer<typeof createShareRequestSchema>;
export type DeleteShareRequest = z.infer<typeof deleteShareRequestSchema>;

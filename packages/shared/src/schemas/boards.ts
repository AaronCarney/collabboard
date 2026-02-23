import { z } from "zod";

export const boardSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type BoardZod = z.infer<typeof boardSchema>;

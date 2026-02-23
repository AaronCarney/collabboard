import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { AccessLevel, BoardShare } from "@collabboard/shared";
import { boardShareSchema } from "@collabboard/shared";

export interface ShareService {
  createShare(boardId: string, accessLevel: AccessLevel, userId: string): Promise<BoardShare>;
  deleteShare(shareId: string, userId: string): Promise<void>;
  listShares(boardId: string, userId: string): Promise<BoardShare[]>;
  validateToken(token: string): Promise<BoardShare | null>;
}

export function createShareService(supabase: SupabaseClient<Database>): ShareService {
  return {
    async createShare(
      boardId: string,
      accessLevel: AccessLevel,
      userId: string
    ): Promise<BoardShare> {
      const { data, error } = await supabase
        .from("board_shares")
        .insert({
          board_id: boardId,
          access_level: accessLevel,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to create share: ${error.message}`);

      const parsed = boardShareSchema.parse(data);
      return parsed;
    },

    async deleteShare(shareId: string, userId: string): Promise<void> {
      const { error } = await supabase
        .from("board_shares")
        .delete()
        .eq("id", shareId)
        .eq("created_by", userId);

      if (error) throw new Error(`Failed to delete share: ${error.message}`);
    },

    async listShares(boardId: string, userId: string): Promise<BoardShare[]> {
      const { data, error } = await supabase
        .from("board_shares")
        .select()
        .eq("board_id", boardId)
        .eq("created_by", userId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(`Failed to list shares: ${error.message}`);

      const shares: BoardShare[] = [];
      for (const row of data) {
        const parsed = boardShareSchema.safeParse(row);
        if (parsed.success) {
          shares.push(parsed.data);
        }
      }
      return shares;
    },

    async validateToken(token: string): Promise<BoardShare | null> {
      const { data, error } = await supabase
        .from("board_shares")
        .select()
        .eq("token", token)
        .single();

      if (error) return null;

      const parsed = boardShareSchema.safeParse(data);
      if (!parsed.success) return null;

      // Check expiry
      if (parsed.data.expires_at) {
        const expiresAt = new Date(parsed.data.expires_at);
        if (expiresAt < new Date()) return null;
      }

      return parsed.data;
    },
  };
}

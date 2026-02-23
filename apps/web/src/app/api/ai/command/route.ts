import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "@collabboard/shared";
import { boardObjectSchema } from "@collabboard/shared";
import type { BoardObject } from "@collabboard/shared";
import { supabaseAdmin } from "@/lib/supabase-server";
import type { TablesInsert } from "@/types/database";
import { routeCommand } from "@/lib/ai/command-router";
import { enqueueForUser } from "@/lib/ai/ai-queue";
import { classifyError, ERROR_MESSAGES } from "@/lib/ai/error-handler";

import { checkRateLimit } from "@/lib/ai/rate-limiter";

const aiCommandRequestSchema = z.object({
  boardId: z.string().uuid(),
  command: z.string().min(1).max(1000),
  context: z
    .object({
      selectedObjectIds: z.array(z.string().uuid()).optional(),
      viewportCenter: z.object({ x: z.number(), y: z.number() }).optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Auth check
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Authentication required", code: "AUTH_ERROR" },
      { status: 401 }
    );
  }

  // Rate limit check
  if (!checkRateLimit(userId)) {
    return NextResponse.json(
      {
        success: false,
        error: "Too many AI requests. Please wait a moment.",
        code: "RATE_LIMITED",
      },
      { status: 429 }
    );
  }

  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body", code: "INVALID_COMMAND" },
      { status: 400 }
    );
  }

  const parsed = aiCommandRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: `Invalid request: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
        code: "INVALID_COMMAND",
      },
      { status: 400 }
    );
  }

  const { boardId, command, context } = parsed.data;

  // Verify board exists and check ownership
  const { data: board, error: boardError } = await supabaseAdmin
    .from("boards")
    .select("id, created_by")
    .eq("id", boardId)
    .single();

  if (boardError && boardError.code !== "PGRST116") {
    return NextResponse.json(
      { success: false, error: "Database error", code: "DB_ERROR" },
      { status: 500 }
    );
  }

  if (!board) {
    return NextResponse.json(
      { success: false, error: "Board not found", code: "BOARD_NOT_FOUND" },
      { status: 404 }
    );
  }

  // Owner-only: share-link model is token-based so we cannot map userId
  // to a share token's access level server-side. AI commands use the
  // service-role key, so we must enforce access ourselves.
  if (board.created_by !== userId) {
    return NextResponse.json(
      {
        success: false,
        error: "You don't have permission to use AI commands on this board",
        code: "AUTH_ERROR",
      },
      { status: 403 }
    );
  }

  // Fetch existing objects
  const { data: existingObjects, error: objectsError } = await supabaseAdmin
    .from("board_objects")
    .select("*")
    .eq("board_id", boardId);

  if (objectsError) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch board objects", code: "DB_ERROR" },
      { status: 500 }
    );
  }

  const parsedObjects = boardObjectSchema.array().safeParse(existingObjects);
  const validObjects: BoardObject[] = parsedObjects.success ? parsedObjects.data : [];

  const safeSelectedIds = (context?.selectedObjectIds ?? []).filter((id: string) =>
    validObjects.some((o) => o.id === id)
  );

  try {
    const result = await enqueueForUser(userId, () =>
      routeCommand({
        command,
        boardId,
        userId,
        existingObjects: validObjects,
        viewportCenter: context?.viewportCenter,
        selectedObjectIds: safeSelectedIds,
      })
    );

    // Persist new/modified objects
    if (result.objects.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from("board_objects")
        .upsert(result.objects as unknown as TablesInsert<"board_objects">[]);

      if (upsertError) {
        console.warn("[AI] Failed to persist objects:", upsertError.message); // eslint-disable-line no-console
      }

      // Broadcast to all connected clients (subscribe before send)
      const channel = supabaseAdmin.channel(`board:${boardId}`);
      try {
        const SUBSCRIBE_TIMEOUT_MS = 5000;
        const subscribePromise = new Promise<void>((resolve, reject) => {
          channel.subscribe((status: string) => {
            if (status === "SUBSCRIBED") {
              resolve();
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              reject(new Error(`Channel subscription failed: ${status}`));
            }
          });
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => {
            reject(new Error("Channel subscribe timed out"));
          }, SUBSCRIBE_TIMEOUT_MS)
        );
        await Promise.race([subscribePromise, timeoutPromise]);

        await channel.send({
          type: "broadcast",
          event: "ai:result",
          payload: { objects: result.objects, userId },
        });
      } catch (broadcastErr: unknown) {
        const msg = broadcastErr instanceof Error ? broadcastErr.message : "Unknown";
        console.warn("[AI] Broadcast failed (non-fatal):", msg); // eslint-disable-line no-console
      } finally {
        await supabaseAdmin.removeChannel(channel);
      }
    }

    // Persist deletions
    if (result.deletedIds && result.deletedIds.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from("board_objects")
        .delete()
        .eq("board_id", boardId)
        .in("id", result.deletedIds);

      if (deleteError) {
        return NextResponse.json(
          { success: false, error: "Failed to delete objects", code: "DB_ERROR" },
          { status: 500 }
        );
      }

      // Broadcast deletions to all connected clients
      const deleteChannel = supabaseAdmin.channel(`board:${boardId}`);
      try {
        const SUBSCRIBE_TIMEOUT_MS = 5000;
        const subscribePromise = new Promise<void>((resolve, reject) => {
          deleteChannel.subscribe((status: string) => {
            if (status === "SUBSCRIBED") {
              resolve();
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              reject(new Error(`Channel subscription failed: ${status}`));
            }
          });
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => {
            reject(new Error("Channel subscribe timed out"));
          }, SUBSCRIBE_TIMEOUT_MS)
        );
        await Promise.race([subscribePromise, timeoutPromise]);

        for (const deletedId of result.deletedIds) {
          await deleteChannel.send({
            type: "broadcast",
            event: "object:delete",
            payload: { id: deletedId, userId },
          });
        }
      } catch (broadcastErr: unknown) {
        const msg = broadcastErr instanceof Error ? broadcastErr.message : "Unknown";
        console.warn("[AI] Delete broadcast failed (non-fatal):", msg); // eslint-disable-line no-console
      } finally {
        await supabaseAdmin.removeChannel(deleteChannel);
      }
    }

    return NextResponse.json({
      success: true,
      objects: result.objects,
      deletedIds: result.deletedIds,
      message: result.message,
      tokensUsed: result.tokensUsed,
      latencyMs: result.latencyMs,
      isTemplate: result.isTemplate,
    });
  } catch (err: unknown) {
    const rawMessage = err instanceof Error ? err.message : "Unknown error";
    console.warn("[AI] Command failed:", rawMessage); // eslint-disable-line no-console
    const category = classifyError(err);
    const code = category === "service_unavailable" ? "SERVICE_UNAVAILABLE" : "LLM_ERROR";
    return NextResponse.json(
      { success: false, error: ERROR_MESSAGES[category], code },
      { status: 500 }
    );
  }
}

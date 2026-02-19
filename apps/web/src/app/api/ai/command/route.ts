import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "@collabboard/shared";
import type { BoardObject } from "@collabboard/shared";
import { createClient } from "@supabase/supabase-js";
import { routeCommand } from "@/lib/ai/command-router";

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

  // Fetch board objects using service role key
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { success: false, error: "Server configuration error", code: "LLM_ERROR" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Verify board exists
  const { data: board } = await supabase.from("boards").select("id").eq("id", boardId).single();

  if (!board) {
    return NextResponse.json(
      { success: false, error: "Board not found", code: "BOARD_NOT_FOUND" },
      { status: 404 }
    );
  }

  // Fetch existing objects
  const { data: existingObjects } = await supabase
    .from("board_objects")
    .select("*")
    .eq("board_id", boardId);

  try {
    const result = await routeCommand({
      command,
      boardId,
      userId,
      existingObjects: (existingObjects ?? []) as BoardObject[],
      viewportCenter: context?.viewportCenter,
    });

    // Persist new/modified objects
    if (result.objects.length > 0) {
      const { error: upsertError } = await supabase.from("board_objects").upsert(result.objects);

      if (upsertError) {
        console.warn("[AI] Failed to persist objects:", upsertError.message); // eslint-disable-line no-console
      }

      // Broadcast to all connected clients
      const channel = supabase.channel(`board:${boardId}`);
      await channel.send({
        type: "broadcast",
        event: "ai:result",
        payload: { objects: result.objects, userId },
      });
      await supabase.removeChannel(channel);
    }

    return NextResponse.json({
      success: true,
      objects: result.objects,
      message: result.message,
      tokensUsed: result.tokensUsed,
      latencyMs: result.latencyMs,
      isTemplate: result.isTemplate,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn("[AI] Command failed:", message); // eslint-disable-line no-console
    return NextResponse.json(
      { success: false, error: `AI command failed: ${message}`, code: "LLM_ERROR" },
      { status: 500 }
    );
  }
}

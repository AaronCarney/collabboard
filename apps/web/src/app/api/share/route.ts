import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createShareRequestSchema, deleteShareRequestSchema } from "@collabboard/shared";
import { supabaseAdmin } from "@/lib/supabase-server";
import { createShareService } from "@/lib/share-service";

const shareService = createShareService(supabaseAdmin);

/** POST /api/share — Create a new share link */
export async function POST(request: Request): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = createShareRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const share = await shareService.createShare(
      parsed.data.board_id,
      parsed.data.access_level,
      userId
    );
    return NextResponse.json(share, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE /api/share — Revoke a share link */
export async function DELETE(request: Request): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = deleteShareRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    await shareService.deleteShare(parsed.data.share_id, userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

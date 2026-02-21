import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { deleteShareRequestSchema } from "@collabboard/shared";
import type { AccessLevel } from "@collabboard/shared";
import { supabaseAdmin } from "@/lib/supabase-server";
import { createShareService } from "@/lib/share-service";

interface CreateShareBody {
  board_id: string;
  access_level: AccessLevel;
}

function isCreateShareBody(value: unknown): value is CreateShareBody {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.board_id === "string" &&
    obj.board_id.length > 0 &&
    (obj.access_level === "view" || obj.access_level === "edit")
  );
}

/** POST /api/share — Create a new share link */
export async function POST(request: Request): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!isCreateShareBody(body)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const shareService = createShareService(supabaseAdmin);
    const share = await shareService.createShare(body.board_id, body.access_level, userId);
    return NextResponse.json(share, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";

    if (message.includes("schema cache")) {
      return NextResponse.json(
        {
          error:
            "Board sharing is not available. The database migration for board_shares has not been applied.",
          code: "SCHEMA_NOT_READY",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: "Failed to create share" }, { status: 500 });
  }
}

/** DELETE /api/share — Revoke a share link */
export async function DELETE(request: Request): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = deleteShareRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const shareService = createShareService(supabaseAdmin);
    await shareService.deleteShare(parsed.data.share_id, userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";

    if (message.includes("schema cache")) {
      return NextResponse.json(
        {
          error:
            "Board sharing is not available. The database migration for board_shares has not been applied.",
          code: "SCHEMA_NOT_READY",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: "Failed to delete share" }, { status: 500 });
  }
}

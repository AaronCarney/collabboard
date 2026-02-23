import { NextResponse } from "next/server";
import { z } from "@collabboard/shared";
import { supabaseAdmin } from "@/lib/supabase-server";
import { createShareService } from "@/lib/share-service";

const shareService = createShareService(supabaseAdmin);

const validateRequestSchema = z.object({
  token: z.string().uuid(),
});

/** POST /api/share/validate — Validate a share token (no auth required) */
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = validateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid token format" }, { status: 400 });
  }

  const share = await shareService.validateToken(parsed.data.token);
  if (!share) {
    return NextResponse.json({ error: "Invalid or expired share link" }, { status: 404 });
  }

  return NextResponse.json({
    valid: true,
    board_id: share.board_id,
    access_level: share.access_level,
  });
}

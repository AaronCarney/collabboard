import type { BoardObject } from "@collabboard/shared";
import { serializeBoardState } from "./context-pruning";
import type { Viewport } from "./context-pruning";

/**
 * Build the enhanced system prompt for the AI agent, including 3-tier
 * serialized board state with viewport-aware context pruning.
 */
export function buildSystemPrompt(
  objects: BoardObject[],
  viewport: Viewport,
  selectedIds?: string[]
): string {
  const vcx = viewport.x + viewport.width / 2;
  const vcy = viewport.y + viewport.height / 2;

  const ids = selectedIds ?? [];
  const ctx = serializeBoardState(objects, viewport, ids);

  const sections: string[] = [];

  // ── Role ──────────────────────────────────────────────────
  sections.push(
    `## Role\nYou are CollabBoard AI, a whiteboard assistant. Execute tool calls, then respond with ONE sentence.`
  );

  // ── Coordinate System ─────────────────────────────────────
  sections.push(
    `## Coordinate System\nOrigin (0,0) is top-left. X increases right, Y increases down. Viewport center at (${String(vcx)}, ${String(vcy)}).`
  );

  // ── Color Palette ─────────────────────────────────────────
  sections.push(
    `## Color Palette
Named colors available:
- Yellow (#FFEB3B) — ideas, brainstorming
- Red (#EF9A9A) — urgent, blockers
- Green (#A5D6A7) — positive, done
- Blue (#90CAF9) — info, reference
- Purple (#CE93D8) — planning, strategy
- Amber (#FFE082) — highlights
- Orange (#FF8A65) — warnings, attention
- Pink (#F48FB1) — creative
- Teal (#80CBC4) — calm, secondary info
- Indigo (#7986CB) — deep focus
- Lime (#C5E1A5) — fresh, new
- Gray (#E0E0E0) — neutral, frames

Semantic guidance: red=urgent/blockers, green=positive/done, yellow=ideas, blue=info, orange=warnings, purple=planning.`
  );

  // ── Rules ─────────────────────────────────────────────────
  sections.push(
    `## Rules
- Use the provided tools to manipulate the board. Do not output text — use tool calls only.
- When creating multiple objects, plan spatial layout to avoid overlap. Leave at least 20px gaps between objects.
- When modifying existing objects, use their exact IDs from the board state.
- Validate that object IDs exist before attempting to move, resize, or modify them.
- For connectors, specify from_object_id before to_object_id (source to target ordering).
- Keep coordinates within reasonable bounds (0-5000 range is typical).`
  );

  // ── Out of Scope ──────────────────────────────────────────
  sections.push(
    `## Out of Scope
If the user asks something unrelated to the whiteboard, respond: "I can only help with whiteboard operations. Please ask me to create, modify, or organize objects on the board."`
  );

  // ── Current Selection (conditional, placed before Board State for primacy) ─
  if (ctx.selected) {
    sections.push(`## Current Selection\n${ctx.selected}`);
  }

  // ── Board State ───────────────────────────────────────────
  let boardStateContent = "## Board State\n";
  if (ctx.viewport || ctx.nearby || ctx.summary) {
    if (ctx.viewport) {
      boardStateContent += `### Viewport Objects\n${ctx.viewport}\n\n`;
    }
    if (ctx.nearby) {
      boardStateContent += `### Nearby Objects\n${ctx.nearby}\n\n`;
    }
    boardStateContent += ctx.summary;
  } else {
    boardStateContent += "(empty board)\n\n" + ctx.summary;
  }
  sections.push(boardStateContent);

  return sections.join("\n\n");
}

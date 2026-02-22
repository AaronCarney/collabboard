# CollabBoard Architectural Fixes — Session Prompt

You are working on CollabBoard at `~/projects/collabboard` (Next.js 14, Supabase, Clerk, Canvas 2D). Read the project's `CLAUDE.md` before starting.

An architectural review was completed and committed at `docs/reviews/architectural-review.md`. Read it in full — it contains exact file paths, line numbers, code snippets, and recommended fixes for every issue below.

**Another team is working on AI agent features (`apps/web/src/lib/ai/`). Do not touch AI files.** They also have uncommitted changes and a pre-existing typecheck error in `command-router.ts` — that's theirs to fix.

## Issues to Fix (prioritized)

### Critical (must fix)

1. **`getPipeline().getObject()` race condition** — `board-store.ts:198-206` uses a no-op `setObjectsMap` updater to read state, which is unsafe under React 18 concurrent mode. Fix: add a parallel `useRef<Map>` updated synchronously on every write, read from the ref instead. This silently breaks duplicate operations.

2. **Unsafe `as BoardObject` casts after Zod `safeParse`** — `board-store.ts:63,78` and `page.tsx:518`. Remove the casts. Ensure `boardObjectSchema` is typed as `z.ZodType<BoardObject>` so `result.data` infers correctly without assertion.

3. **Canvas dimensions reset every rAF frame** — `BoardCanvas.tsx:148-153`. Setting `canvas.width`/`canvas.height` unconditionally forces a layout reflow every frame. Fix: track last known size, only reset when dimensions actually change. Use ResizeObserver.

### Warnings (should fix)

4. **`deserializeClipboard` skips Zod validation** — `transforms.ts:46-54`. This is the only ingestion path that doesn't validate through `boardObjectSchema`. Run each element through `safeParse`.

5. **Connector renderer module-level singleton** — `connector-renderer.ts:15`. `setObjectResolver` is a shared mutable singleton. Pass resolver as render-time argument or inject via draw context.

6. **Zoom handler ignores delta magnitude** — `page.tsx:333-349`. Binary zoom (1.1x or 1/1.1x) regardless of wheel delta. Use `Math.exp(delta * 0.8)` for analog pinch zoom.

7. **Cursor username not truncated** — `BoardCanvas.tsx:788`. `cursor.userName` rendered without length cap. Truncate to 30 chars.

8. **`hitTestHandle` ignores rotation** — `board-logic.ts:146-159`. Resize handles are hit-tested in axis-aligned space but rendered rotated. Inverse-rotate the mouse point before testing.

9. **Multi-drag broadcasts every mousemove** — `BoardCanvas.tsx:432-441`. Split into local-only state update + throttled broadcast (~50ms).

10. **`canUndo`/`canRedo` stale reads** — `board-store.ts:222-223`. Computed from plain ref, not React state. Add a `historyVersion` counter to force re-render.

### Observations (nice to have)

11. **Renderers don't apply `strokeColor`/`strokeWidth`** — rectangle, circle, sticky-note renderers ignore these properties even though PropertyPanel exposes them.

12. **`wrapText` doesn't handle `\n`** — `render-utils.ts:57`. Split on newlines first, then word-wrap each line.

13. **Connector `getBounds` returns zero height for horizontal lines** — axis-aligned connectors vanish from spatial index. Add minimum padding.

14. **MenuBar File items are no-ops** — "New Board" and "Duplicate Board" just close the menu.

## Process

- TDD: write failing test first, then implement, then verify green.
- Verification gate after each fix: `pnpm typecheck && pnpm lint && pnpm test` (ignore pre-existing `command-router.ts` typecheck error).
- Commit after each fix or logical group — don't batch everything into one commit.
- 1075 tests currently passing across 69 files.

# Architectural Fixes — Progress Tracker

Source: `docs/reviews/architectural-review.md`
Started: 2026-02-21

## Completed

### Critical #2: Unsafe `as BoardObject` casts after Zod safeParse — `98b9c75`

- Added `strokeColor` and `strokeWidth` to Zod base schema (`packages/shared/src/schemas/board-objects.ts`)
- Removed 3 `as BoardObject` casts: `board-store.ts:63,78` and `page.tsx:586`
- Type drift now caught at compile time instead of silently masked

### Critical #1: `getPipeline().getObject()` race condition — `cdde166`

- Added `objectsMapRef` (useRef<Map>) updated synchronously on every `setObjectsMap` call
- Wrapped `setObjectsMapRaw` with `setObjectsMap` helper that keeps ref in sync
- `getObject()` now reads from `objectsMapRef.current` — safe under React 18 concurrent mode
- Added 3 tests in `board-store.test.ts` (1078 total, all passing)

### Warning #4: `deserializeClipboard` skips Zod validation — ALREADY FIXED

- Code at `transforms.ts:51` already uses `boardObjectSchema.safeParse` filter
- Tests at `transforms.test.ts:377-435` cover Zod validation (invalid fields, mixed valid/invalid)
- No action needed

## Remaining

### Critical #3: Canvas dimensions reset every rAF frame

- **File:** `BoardCanvas.tsx:148-153`
- **Problem:** `canvas.width = w * dpr` runs every frame, forcing layout reflow even when unchanged
- **Fix:** Track last known size in a ref, only reset canvas dimensions when they change. Use ResizeObserver.
- **Test approach:** Unit test that render() doesn't reset canvas dimensions when size unchanged

### Warning #5: Connector renderer module-level singleton

- **File:** `connector-renderer.ts:15`
- **Problem:** `setObjectResolver` is a shared mutable singleton — test isolation issues, concurrent render hazard
- **Fix:** Pass resolver as argument to `draw()` via a render context, or pass objectsMap directly
- **Note:** This changes the `ShapeRenderer` interface — ripple effect to all renderers and tests

### Warning #6: Zoom handler ignores delta magnitude

- **File:** `page.tsx:407` (handleZoom)
- **Problem:** Binary zoom (1.1x or 1/1.1x) regardless of wheel delta magnitude
- **Fix:** `const factor = Math.exp(delta * 0.8)` for analog pinch zoom
- **Test file:** `zoom-speed.test.ts` (12 existing tests — may need updates)

### Warning #7: Cursor username not truncated

- **File:** `BoardCanvas.tsx:868` (drawCursor)
- **Problem:** `cursor.userName` rendered without length cap — DoS via long usernames
- **Fix:** Truncate to 30 chars before `ctx.fillText` and `ctx.measureText`

### Warning #8: `hitTestHandle` ignores rotation

- **File:** `board-logic.ts:149-162`
- **Problem:** Hit test uses axis-aligned coords but handles render rotated
- **Fix:** Inverse-rotate mouse point before testing: transform (wx,wy) into object's local frame
- **Test file:** `board-logic.test.ts` (50 existing tests — add rotation-aware handle tests)

### Warning #9: Multi-drag broadcasts every mousemove

- **File:** `BoardCanvas.tsx:488-498` (handleMouseMove during drag)
- **Problem:** At 120Hz, fires 120+ broadcasts/sec per dragged object
- **Fix:** Split into local-only state update + throttled broadcast at ~50ms intervals
- **Test approach:** Test that onObjectsMove is called on every mousemove but broadcast is throttled

### Warning #10: `canUndo`/`canRedo` stale reads

- **File:** `board-store.ts:222-223`
- **Problem:** Computed from plain ref, not React state — doesn't trigger re-render after history ops
- **Fix:** Add `historyVersion` state counter, increment after each execute/undo/redo

### Observation #11: Renderers don't apply `strokeColor`/`strokeWidth`

- **Files:** `rectangle-renderer.ts`, `circle-renderer.ts`, `sticky-note-renderer.ts`
- **Fix:** Read `obj.strokeColor` and `obj.strokeWidth` in draw(), apply as stroke after fill

### Observation #12: `wrapText` doesn't handle `\n`

- **File:** `render-utils.ts:65`
- **Problem:** `text.split(" ")` treats `\n` as part of word token
- **Fix:** Split on newlines first, then word-wrap each line

### Observation #13: Connector `getBounds` returns zero height for axis-aligned lines

- **File:** `connector-renderer.ts:186-203`
- **Problem:** Horizontal connector → height=0 → disappears from spatial index
- **Fix:** Add minimum padding (e.g., `Math.max(width, 1)` and `Math.max(height, 1)`)

### Observation #14: MenuBar File items are no-ops

- **File:** `MenuBar.tsx:71-74`
- **Problem:** "New Board" and "Duplicate Board" just close menu
- **Note:** "Export as PNG" has `export-png.ts` ready but unwired
- **Fix:** Wire exportPNG from BoardContext; New Board → router.push; Duplicate → API call

## Pre-existing Issues (not ours to fix)

- `command-router.ts:117-118` — typecheck errors (`promptTokens`/`completionTokens`) — other team's AI work
- `board-limit.test.tsx` — flaky test (timeout-dependent, passes inconsistently in full suite)

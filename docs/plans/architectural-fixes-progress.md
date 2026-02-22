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

### Critical #3: Canvas dimensions reset every rAF frame — `c2ee8eb`

- Added `lastCanvasSizeRef` to track last known canvas dimensions (w, h, dpr)
- Only reassigns `canvas.width`/`canvas.height` when dimensions actually change
- Uses `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` instead of `ctx.scale()` to avoid transform accumulation
- Added 2 tests in `BoardCanvas.test.tsx` (1080 total)

### Warning #5: Connector renderer module-level singleton — `acc0f3c`

- Added `RenderContext` interface to `renderers/types.ts` with `objectResolver` function
- Updated `ShapeRenderer` interface: `draw()`, `hitTest()`, `getBounds()` accept optional `RenderContext`
- Connector renderer now uses context param with fallback to legacy singleton
- BoardCanvas builds `RenderContext` and passes to `renderer.draw()`
- Added 3 tests in `connector-renderer.test.ts` (1083 total)

### Warning #6: Zoom handler ignores delta magnitude — `df0dc20`

- Added `getZoomSensitivity()` to `zoom-speed.ts` with per-speed multipliers (slow=0.5, normal=1.0, fast=2.5)
- Changed `handleZoom` in `page.tsx` from binary `1.1x` to `Math.exp(delta * sensitivity)`
- Larger wheel/pinch deltas now produce proportionally larger zoom changes
- Added 3 tests in `zoom-speed.test.ts` (1086 total)

### Warning #7: Cursor username not truncated — `fc1bc46`

- Truncates `cursor.userName` to 30 chars with ellipsis (`\u2026`) before measuring and rendering
- Applied to both `ctx.measureText()` and `ctx.fillText()` calls in `drawCursor()`
- Added 2 tests in `BoardCanvas.test.tsx` (1088 total)

### Warning #10: `canUndo`/`canRedo` stale reads — `d5ff01f`

- Added `historyVersion` state counter, incremented in `undo()` and `redo()` callbacks
- `canUndo`/`canRedo` now recompute on each render triggered by the counter
- Added 2 tests in `board-store.test.ts` (1090 total)

### Warning #8: `hitTestHandle` ignores rotation — `8765ea2`

- Inverse-rotate mouse point into object's local coordinate frame before testing handle positions
- Uses center-of-object as rotation pivot, applies -rotation transform
- Added 3 tests in `board-logic.test.ts` (1093 total)

### Warning #9: Multi-drag broadcasts every mousemove — `eb062ac`

- Extracted `broadcastMoves` helper from `moveObjects` in `board-store.ts`
- Leading-edge throttle: first broadcast fires immediately, subsequent within 50ms are queued
- Trailing-edge fires after 50ms with latest positions from `objectsMapRef`
- `persist=true` (mouseup) always broadcasts immediately and clears pending throttle
- Added 2 tests in `board-store.test.ts` (1106 total)

### Observation #11: Renderers apply `strokeColor`/`strokeWidth` — `8765ea2`

- Rectangle, circle, and sticky-note renderers now read `obj.strokeColor` and `obj.strokeWidth`
- Stroke applied after fill, before selection highlight
- Added 2 tests per renderer (1106 total)

### Observation #12: `wrapText` handles `\n` — `8765ea2`

- Split text on `\n` first (paragraphs), then word-wrap each paragraph
- Created new test file `render-utils.test.ts` with 3 tests

### Observation #13: Connector `getBounds` minimum dimensions — `8765ea2`

- `getBounds` now returns `Math.max(width, 1)` and `Math.max(height, 1)`
- Prevents axis-aligned connectors from disappearing from spatial index
- Added 2 tests in `connector-renderer.test.ts`

### Observation #14: MenuBar File items wired — `b1c9a38`

- "New Board" navigates to `/dashboard` via `router.push`
- "Duplicate Board" calls `onDuplicateBoard` prop callback
- "Export as PNG" was already wired (prior commit)
- Added 2 tests in `MenuBar.test.tsx` (1108 total)

## Remaining

None — all 14 architectural review findings addressed.

## Pre-existing Issues (not ours to fix)

- `command-router.ts:117-118` — typecheck errors (`promptTokens`/`completionTokens`) — other team's AI work
- `board-limit.test.tsx` — flaky test (timeout-dependent, passes inconsistently in full suite)

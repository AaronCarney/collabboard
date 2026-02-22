# Architectural Review — CollabBoard Canvas/UX Overhaul

Reviewer: Reviewer agent (Mode B — Architectural)
Date: 2026-02-21
Scope: canvas/UX overhaul — board-logic, spatial-index, BoardCanvas, renderers, transforms, board-store, page, UI components

---

## Critical Issues (must fix before merge)

### 1. Unsafe Type Assertion After Zod Validation Defeats the Point of Zod

**Files:**

- `/home/context/projects/collabboard/apps/web/src/lib/board-store.ts:63` — `valid.push(result.data as BoardObject)`
- `/home/context/projects/collabboard/apps/web/src/lib/board-store.ts:78` — `return result.data as BoardObject`
- `/home/context/projects/collabboard/apps/web/src/app/board/[boardId]/page.tsx:518` — `validatedObjects.push(result.data as BoardObject)`

**Problem:** Zod's `safeParse` returns `result.data` typed as the inferred schema output. The `as BoardObject` cast is unnecessary when the Zod schema is properly typed, and signals that the schema output type and the `BoardObject` TypeScript type are diverging. If the schema type and the TS type ever drift, this cast silently masks the mismatch. The `result.data` from a successful `safeParse` should already be `BoardObject` if the schema is `z.infer`-aligned.

**Risk:** Silent type divergence between runtime validation and compile-time types. If someone changes the Zod schema without updating the TS type (or vice versa), objects with wrong shapes will silently pass into the application.

**Fix:** Remove all `as BoardObject` casts that follow a successful `safeParse`. Instead, ensure `boardObjectSchema` is defined as `z.ZodType<BoardObject>` so `result.data` is naturally typed as `BoardObject` without a cast.

---

### 2. `getPipeline().getObject()` Reads State via `setObjectsMap` Side-Effect — Race Condition

**File:** `/home/context/projects/collabboard/apps/web/src/lib/board-store.ts:198-206`

```ts
getObject(id: string) {
  let found: BoardObject | null = null;
  setObjectsMap((prev) => {
    found = prev.get(id) ?? null;
    return prev;
  });
  return found;
},
```

**Problem:** This reads state by passing a no-op setState updater to capture the current value in a closure. This is a well-known React anti-pattern. React does not guarantee that setState updaters run synchronously in all contexts (concurrent mode, batching, StrictMode double-invocation). The `found` variable is initialized to `null` before the setState call; if the updater is deferred, `found` will be `null` when returned. This is currently used by `createDuplicateCommand` to resolve source objects before duplicating them — a race here silently produces empty duplicates with no error.

**Risk:** Under React concurrent mode (enabled by default in React 18 with Next.js App Router), this read is not safe. The duplicate command silently produces nothing if the read races.

**Fix:** Store `objectsMap` in a `useRef` in parallel with the `useState`, updated synchronously on every write. Use `objectsMapRef.current.get(id)` in `getObject`. Example pattern:

```ts
const objectsMapRef = useRef<Map<string, BoardObject>>(new Map());
// In every setObjectsMap call, also update ref:
objectsMapRef.current = nextMap;
```

Then `getObject` becomes: `return objectsMapRef.current.get(id) ?? null;`

---

### 3. Canvas Dimensions Reset on Every Render Frame — Continuous Layout Thrash

**File:** `/home/context/projects/collabboard/apps/web/src/components/board/BoardCanvas.tsx:148-153`

```ts
const dpr = window.devicePixelRatio || 1;
const w = canvas.clientWidth;
const h = canvas.clientHeight;
canvas.width = w * dpr;
canvas.height = h * dpr;
ctx.scale(dpr, dpr);
```

**Problem:** Setting `canvas.width` or `canvas.height` resets the canvas context state (clears the canvas and invalidates the transform matrix) — this is intentional for clearing, but it also triggers a browser layout read (`clientWidth`, `clientHeight`), which forces a synchronous reflow every frame even when the size has not changed. On a 60 Hz display with large canvases this is measurable overhead.

**Risk:** Performance degradation proportional to DOM complexity. On boards with many DOM nodes in the surrounding page, `clientWidth`/`clientHeight` reads inside rAF loops are a common source of jank.

**Fix:** Track the last known canvas size. Only reset `canvas.width`/`canvas.height` when the dimensions actually change. Use a `ResizeObserver` on the container (already set up partially in the resize `useEffect`) to record the current pixel dimensions and compare before setting.

---

## Warnings (should fix)

### 4. `deserializeClipboard` Returns Unvalidated Objects

**File:** `/home/context/projects/collabboard/apps/web/src/lib/transforms.ts:46-54`

```ts
export function deserializeClipboard(json: string): BoardObject[] {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed as BoardObject[]; // no schema validation
  } catch {
    return [];
  }
}
```

**Problem:** Objects read from the clipboard are cast directly to `BoardObject[]` without running them through `boardObjectSchema`. A malicious clipboard value (or corrupted data) will pass into `createPasteCommand` and be upserted to Supabase without validation. Every other ingestion path (loadObjects, broadcast, AI results) validates through Zod — this is an inconsistent gap.

**Fix:** Run each element through `boardObjectSchema.safeParse` (same as `validateBoardObjects` in board-store.ts) and only return validated elements.

---

### 5. Module-Level Mutable Singleton in `connector-renderer.ts` Creates Implicit Coupling

**File:** `/home/context/projects/collabboard/apps/web/src/components/board/renderers/connector-renderer.ts:15`

```ts
let resolver: ObjectResolver = () => null;
export function setObjectResolver(fn: ObjectResolver): void {
  resolver = fn;
}
```

**Problem:** The module-level `resolver` is a shared singleton. `setObjectResolver` is called once per render pass from `BoardCanvas.tsx:171`. In a server-side render or test environment, multiple concurrent render passes (possible with React 18 concurrent rendering) would overwrite each other's resolver. More practically: if a test renders two `BoardCanvas` instances simultaneously, their resolvers collide. This also makes the connector renderer stateful in ways invisible to its callers.

**Risk:** Subtle test isolation failures; potential rendering corruption in concurrent mode.

**Fix:** Pass the resolver as a render-time argument (e.g., a context parameter on `ShapeRenderer.draw`) or store it on a per-render context object passed through the render loop. Alternatively, pass the `objectsMap` directly to `draw` as a second argument and eliminate the resolver indirection.

---

### 6. `handleZoom` Ignores `delta` Magnitude — Zoom Sensitivity Is Binary

**File:** `/home/context/projects/collabboard/apps/web/src/app/board/[boardId]/page.tsx:333-349`

```ts
const factor = delta > 0 ? 1.1 : 1 / 1.1;
const newZoom = Math.max(0.02, Math.min(20, prev.zoom * factor));
```

**Problem:** The zoom handler discards the magnitude of `delta` entirely — any non-zero positive delta produces a 1.1x zoom in, any negative delta produces a 1/1.1x zoom out. Trackpad pinch gestures on macOS send continuous wheel events with `deltaY` values proportional to pinch speed (often `0.5` to `50`). Treating all of these identically makes pinch zoom feel like button presses rather than analog control, and is especially noticeable on trackpads vs. wheels.

The `delta` passed from `BoardCanvas.tsx:618` is already `-e.deltaY * 0.001`, so the sign and rough magnitude are preserved, but the downstream handler ignores magnitude.

**Fix:** Use the magnitude of `delta` to compute the zoom factor proportionally:

```ts
const factor = Math.exp(delta * 0.8); // or similar tuning
```

This gives smooth, analog pinch zoom consistent with Figma/Miro behavior.

---

### 7. `drawCursor` Renders Untrusted User-Provided Text Directly to Canvas

**File:** `/home/context/projects/collabboard/apps/web/src/components/board/BoardCanvas.tsx:788`

```ts
ctx.fillText(cursor.userName, 14, 17);
```

**Problem:** `cursor.userName` originates from the realtime broadcast `CursorPayload` and is set by each connected client. There is no length cap or sanitization before rendering. A user could set a username of 10,000 characters, causing `ctx.measureText` and `ctx.fillText` to process very large strings on every frame for every collaborator. This is a denial-of-service vector for canvas rendering performance.

Canvas `fillText` does not create XSS vectors (canvas is rasterized, not DOM), so this is a performance/DoS concern rather than an injection risk.

**Fix:** Truncate `cursor.userName` to a reasonable length (e.g., 30 characters) before rendering, either in `drawCursor` or when ingesting the cursor payload.

---

### 8. `hitTestHandle` Does Not Account for Object Rotation

**File:** `/home/context/projects/collabboard/apps/web/src/lib/board-logic.ts:146-159`

**Problem:** `hitTestHandle` checks world coordinates against axis-aligned handle positions returned by `getResizeHandles`. When an object has a non-zero `rotation`, the canvas transform rotates the handles visually, but the hit test still uses unrotated AABB coordinates. This means clicking a visually-rotated handle will miss, and clicking the unrotated position (which may be inside the object or off-screen) will register as a handle hit.

The render loop in `BoardCanvas.tsx:188-196` does apply `ctx.rotate` around the object center before drawing — but the world-space mouse coordinates are in the unrotated frame, and `hitTestHandle` does not inverse-rotate the point.

**Fix:** Before calling `hitTestHandle`, transform the world-space mouse coordinates into the object's local (unrotated) frame:

```ts
const rad = degreesToRadians(obj.rotation);
const cx = obj.x + obj.width / 2;
const cy = obj.y + obj.height / 2;
const localX = Math.cos(-rad) * (wx - cx) - Math.sin(-rad) * (wy - cy) + cx;
const localY = Math.sin(-rad) * (wx - cx) + Math.cos(-rad) * (wy - cy) + cy;
// then call hitTestHandle(localX, localY, obj, handleSize)
```

---

### 9. Multi-Drag Broadcasts Every `mousemove` Event Without Throttling

**File:** `/home/context/projects/collabboard/apps/web/src/components/board/BoardCanvas.tsx:432-441`

A comment in the source acknowledges this:

> "Known limitation: broadcasts fire every mousemove (no throttle). Throttling here would make local rendering laggy since moveObjects drives React state."

**Problem:** At 120 Hz displays with high-precision trackpads, this can fire 120+ times per second per dragged object. For N objects selected and K collaborators, this is N \* K Supabase Realtime messages per second. During a 5-second multi-object drag this can produce hundreds of messages.

**Fix:** The comment correctly identifies the tension. The correct fix is to split `moveObjects` into two paths: a local-only state update (for smooth rendering) and a debounced/throttled broadcast. The local update path skips the `channelRef.current.send` call entirely; a separate `useRef` timer fires the broadcast at ~50ms intervals.

---

### 10. `canUndo`/`canRedo` Are Computed Outside React State — Stale After Mutations

**File:** `/home/context/projects/collabboard/apps/web/src/lib/board-store.ts:222-223`

```ts
const canUndo = history.canUndo();
const canRedo = history.canRedo();
```

**Problem:** `historyRef.current` is a plain object (not React state). `canUndo` and `canRedo` are computed once at render time from the history's current length. After `history.execute()` or `history.undo()` is called, these values do not update until the next render cycle caused by some unrelated state change. The MenuBar reads `ctx.canUndo`/`ctx.canRedo` to disable menu items — these could be stale if the history changes without any other state changing.

**Fix:** Track undo/redo availability as `useState` that is updated whenever history changes, or use a counter-based approach that forces a re-render. A simple fix: maintain a `historyVersion` state counter incremented after each history operation.

---

## Observations (nice to have)

### A. `SpatialIndex` Has No Invalidation/Update Path — Only Insert/Clear

**File:** `/home/context/projects/collabboard/apps/web/src/lib/spatial-index.ts`

The index is rebuilt from scratch on every `objects` change (BoardCanvas.tsx:130-139). For a board with 1,000 objects and a single object moving every frame, this rebuilds all 1,000 insertions on every mousemove. A per-object update (remove old cells, insert into new cells) would reduce this to O(cells per object) per update. This is not critical at typical board sizes but matters at scale.

### B. `drawGrid` Draws Grid Lines in World Space After Camera Transform

**File:** `/home/context/projects/collabboard/apps/web/src/components/board/BoardCanvas.tsx:707-726`

This is correct and efficient — computing grid bounds in world space avoids off-screen overdraw. Good implementation.

### C. `rectangleRenderer` Does Not Apply `strokeColor` or `strokeWidth`

**File:** `/home/context/projects/collabboard/apps/web/src/components/board/renderers/rectangle-renderer.ts`

The `PropertyPanel` exposes stroke color and stroke width controls, and these properties exist on `BoardObject`. The rectangle renderer only draws the fill and the selection outline — it never reads `obj.strokeColor` or `obj.strokeWidth`. Users who set a stroke color will see no visual effect. The same issue likely applies to `circleRenderer` and `stickyNoteRenderer`.

### D. `wrapText` Splits on Spaces Only — No Newline Handling

**File:** `/home/context/projects/collabboard/apps/web/src/components/board/renderers/render-utils.ts:57-81`

```ts
const words = text.split(" ");
```

Text content with newlines (`\n`) will treat `\n` as part of a word token, not as a line break. Sticky notes with multi-line content will render as a single run with embedded newline characters rather than separate visual lines.

### E. `connectorRenderer.getBounds` Returns Zero-Width/Height for Horizontal/Vertical Lines

**File:** `/home/context/projects/collabboard/apps/web/src/components/board/renderers/connector-renderer.ts:186-203`

For a perfectly horizontal connector, `minY === maxY`, so `height` is `0`. This means the spatial index will never return this connector in a viewport query (since `obj.y + obj.height >= top` will fail when height is 0 and the connector is exactly at the boundary). Connectors that are axis-aligned may disappear from the viewport at certain camera positions.

### F. `deserializeClipboard` Returns Typed Array Without Runtime Guarantee

Already flagged as Warning #4. Repeated here as an observation on the pattern: the internal clipboard uses `clipboardRef.current` (a `useRef`) rather than the browser's Clipboard API. This means copy/paste does not work across browser tabs or after page reload. This may be intentional for now but is worth tracking.

### G. `MenuBar` File Items Have No Implementation

**File:** `/home/context/projects/collabboard/apps/web/src/components/board/MenuBar.tsx:71-74`

```ts
const fileItems: MenuItem[] = [
  { label: "New Board", onClick: closeMenu },
  { label: "Duplicate Board", onClick: closeMenu },
  { label: "Export as PNG", onClick: closeMenu },
];
```

All three File menu items just close the menu with no action. "Export as PNG" in particular has a corresponding `export-png.ts` lib that is never wired up here.

### H. `handleBoardNameChange` Sanitization Allows Control Characters Between 0x20 and 0x7F

**File:** `/home/context/projects/collabboard/apps/web/src/app/board/[boardId]/page.tsx:122-128`

The filter `code >= 0x20 && code !== 0x7f` permits DEL+1 through high-byte characters and misses Unicode control characters in the range U+0080–U+009F. In practice this is harmless for a board name field, but the comment implies the intent was to strip control characters. Using `.trim()` plus a max-length is probably sufficient without the manual character filter.

---

## Security Assessment

**Auth:** Clerk middleware at `/home/context/projects/collabboard/apps/web/src/middleware.ts` protects all non-public routes correctly. Board page checks `readOnly` before all mutations.

**Input Validation:** AI command response objects are validated through `boardObjectSchema.safeParse` before merge. Realtime broadcast payloads are validated. The clipboard path is the only unvalidated ingestion route (Warning #4).

**XSS:** Canvas rendering is rasterized — `fillText` with user content does not create DOM injection vectors. The cursor username rendering issue (Warning #7) is DoS, not XSS.

**RLS:** Not directly reviewable from this codebase review, but the Supabase client setup (`createClerkSupabaseClient`) uses Clerk JWT for authentication — consistent with RLS enforcement at the DB level.

**Human review flag:** The share token validation path (`validateShareToken` in `page.tsx:106`) gates access control. This should receive human review before production use.

---

## Test Coverage Assessment

**Good coverage:**

- `spatial-index.test.ts` — thorough, including negative coords, deduplication, and performance subset test
- `board-logic.test.ts` — excellent coverage of all exported functions including edge cases (ellipse corners, z-order, negative selection rects)
- `transforms.test.ts` — full command lifecycle (execute/undo/redo) for all command factories
- `board-store.test.ts` — comprehensive CRUD, dual-client routing, and realtime channel management
- `view-controls.test.ts` — good edge case coverage for fit-to-screen

**Needs more tests:**

- `connector-renderer.ts` — `getBounds` zero-dimension edge case (axis-aligned connectors) is not tested
- `BoardCanvas.tsx` — rotation + handle hit test interaction is not tested (the bug in Warning #8 would be caught by a test)
- `render-utils.ts` — `wrapText` with embedded newlines is not tested
- `board-store.ts` — `getPipeline().getObject()` concurrent-mode race is not tested (the anti-pattern in Critical #2)
- `MenuBar.tsx` — File menu items (New Board, Export) have no tests because they have no implementation
- `deserializeClipboard` — no test for objects with extra/wrong fields (would catch Warning #4 gap)

---

## Summary

- Critical: 3
- Warnings: 7
- Observations: 8

**Overall assessment: REQUEST_CHANGES**

The three critical issues each represent a real failure mode in production:

1. The `as BoardObject` casts after `safeParse` undermine type safety at the ingestion boundary — the exact boundary Zod is meant to protect. This is low-effort to fix and high-value.

2. The `getPipeline().getObject()` setState-as-read pattern is a React concurrent mode bug waiting to trigger in production. It silently returns `null` under batching, causing duplicate commands to produce empty output. React 18 with Next.js App Router enables concurrent features by default.

3. Canvas dimension reset on every rAF iteration forces a layout read every frame regardless of whether the size changed. On a large board with many collaborators (multiple cursor renders, many objects), this is compounding overhead.

The warnings are real quality issues but individually survivable. Warning #8 (rotation + handle hit test mismatch) is the most user-visible — any user who rotates an object will find resizing broken.

**Human review required:** Yes — share token validation path at `page.tsx:104-114` (data access control gate).

# Board UX Fixes — Spec

**Status:** Active
**Scope:** 6 bug fixes / feature gaps in CollabBoard's whiteboard UI

---

## Issue 1: Welcome Board Dismissal

**Problem:** `EmptyBoardHint` overlay cannot be manually dismissed — only disappears when an object is added.

**Acceptance Criteria:**

- AC1.1: Welcome hint displays a visible close/dismiss button (X icon, top-right corner)
- AC1.2: Clicking the dismiss button hides the hint immediately
- AC1.3: Dismissal persists via `localStorage` key `collabboard:hint-dismissed` so it stays hidden on page reload
- AC1.4: Hint still auto-hides when `objects.length > 0` (existing behavior preserved)

---

## Issue 2: Connector Drawing (Two-Click Workflow)

**Problem:** `draw-connector-mode.ts` is a stub — all handlers are no-ops. Connectors are created with empty `from_object_id`/`to_object_id`, collapsing to invisible zero-length lines.

**Acceptance Criteria:**

- AC2.1: When connector tool is active, clicking on a shape highlights it as the "source" and shows a visual indicator (port dots on object edges)
- AC2.2: After selecting a source, moving the mouse shows a ghost/preview line from the source port to the cursor
- AC2.3: Clicking on a second shape creates a connector with valid `from_object_id`, `to_object_id`, `from_port`, `to_port`
- AC2.4: The created connector is visible — rendered as a line between the two objects with proper color and arrow
- AC2.5: Pressing Escape or clicking on empty canvas cancels the connector drawing (resets to no source)
- AC2.6: Connectors update position when connected objects are moved (existing renderer behavior — just verify)
- AC2.7: The `handleCanvasClick` in page.tsx must NOT call `store.createObject('connector', wx, wy)` for the connector tool — connector creation is handled by the interaction mode

---

## Issue 3: Export as PNG

**Problem:** "Export as PNG" menu item in File menu only closes the dropdown — no export logic exists.

**Acceptance Criteria:**

- AC3.1: Clicking "Export as PNG" captures the current canvas content (all visible objects) to a PNG file
- AC3.2: The PNG is downloaded to the user's device with filename `{boardName}.png`
- AC3.3: Export captures the full board extent (all objects), not just the visible viewport
- AC3.4: Export works regardless of current zoom level
- AC3.5: Use `canvas.toDataURL('image/png')` approach — render all objects to an offscreen canvas, then trigger download

---

## Issue 4: Extended Zoom Range

**Problem:** Zoom capped at 10%–500%. Not sufficient for large boards (need to zoom further out) or detail work (need more zoom in).

**Acceptance Criteria:**

- AC4.1: Minimum zoom reduced to 0.02 (2%)
- AC4.2: Maximum zoom increased to 20 (2000%)
- AC4.3: All zoom controls updated consistently: `handleZoomIn`, `handleZoomOut`, `handleZoom` (wheel), and View menu items
- AC4.4: Zoom step remains 0.1 for button clicks near 100%, but uses proportional stepping at extremes (multiply/divide by 1.1)

---

## Issue 5: Movable Color Palette with Advanced Features

**Problem:** `PropertyPanel` is fixed at `absolute bottom-4 right-4`. Not draggable. Only 10 fixed color swatches.

**Acceptance Criteria:**

- AC5.1: PropertyPanel is draggable — user can click-and-drag the header to reposition it anywhere on screen
- AC5.2: Panel position persists within the session (resets on page reload is acceptable)
- AC5.3: Add a custom color input (hex input field) below the swatches so users can enter any color
- AC5.4: Add a "stroke color" section for shapes that have borders (rectangle, circle, frame)
- AC5.5: Add a "line thickness" control (1px, 2px, 3px, 5px, 8px) for lines and connectors

---

## Issue 6: Board Sharing — Missing Table

**Problem:** Error "Could not find the table 'public.board_shares' in the schema cache" when sharing. Migration file exists at `supabase/migrations/20260219080000_add_board_shares.sql` but table is not in PostgREST schema cache.

**Acceptance Criteria:**

- AC6.1: The share service uses `supabaseAdmin` (service role key) which bypasses RLS — verify this is working
- AC6.2: Add a DB health check: the `/api/share` POST route should return a clear error message if the `board_shares` table doesn't exist, with instructions to run migrations
- AC6.3: Add a `supabase/migrations/README.md` noting that migrations must be applied manually via `supabase db push` or the Supabase dashboard
- AC6.4: Regenerate Supabase types to include `board_shares` in the type definitions (`packages/db/`)
- AC6.5: The share API route should catch the specific "schema cache" error and return a 503 with a user-friendly message instead of a raw 500

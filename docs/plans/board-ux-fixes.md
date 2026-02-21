# Board UX Fixes — Implementation Plan

**Spec:** `docs/specs/board-ux-fixes.md`
**Approach:** 3 batches, ordered by dependency and complexity

---

## Batch 1: Quick Fixes (Independent, Parallel TDD+Impl)

### 1A — Welcome Board Dismiss (Issue 1)

**Files:**

- `apps/web/src/components/board/EmptyBoardHint.tsx` — add X button, accept `onDismiss` prop
- `apps/web/src/app/board/[boardId]/page.tsx` — manage `hintDismissed` state with localStorage

**Steps:**

1. Add `onDismiss` callback prop to `EmptyBoardHint`
2. Add an X button (pointer-events-auto) in top-right of the hint card
3. In page.tsx, init state from `localStorage.getItem('collabboard:hint-dismissed')`
4. On dismiss: set state + `localStorage.setItem('collabboard:hint-dismissed', 'true')`
5. Render hint only when `objects.length === 0 && !editingId && !hintDismissed`

### 1B — Extended Zoom Range (Issue 4)

**Files:**

- `apps/web/src/components/board/MenuBar.tsx` — update min/max in zoom buttons and view items
- `apps/web/src/app/board/[boardId]/page.tsx` — update `handleZoom` clamp range

**Steps:**

1. Define constants: `MIN_ZOOM = 0.02`, `MAX_ZOOM = 20`
2. Replace all `Math.max(0.1, ...)` → `Math.max(MIN_ZOOM, ...)`
3. Replace all `Math.min(5, ...)` → `Math.min(MAX_ZOOM, ...)`
4. Use proportional stepping: for zoom buttons, multiply/divide by 1.2 instead of ±0.1

### 1C — Share Error Handling (Issue 6)

**Files:**

- `apps/web/src/app/api/share/route.ts` — catch schema cache error, return 503
- `apps/web/src/lib/share-service.ts` — no changes needed (logic is correct)

**Steps:**

1. In the POST handler's catch block, check if error message contains "schema cache"
2. Return 503 with `{ error: "Board sharing is not available. The database migration for board_shares has not been applied.", code: "SCHEMA_NOT_READY" }`
3. Update the ShareDialog to show a user-friendly message for 503 responses

---

## Batch 2: Medium Features (Parallel TDD+Impl)

### 2A — Export as PNG (Issue 3)

**Files:**

- `apps/web/src/components/board/MenuBar.tsx` — wire export click handler
- `apps/web/src/lib/export-png.ts` — NEW: export logic using offscreen canvas
- `apps/web/src/components/board/BoardContext.tsx` — add `exportPng` to context (needs objects + renderers)

**Steps:**

1. Create `export-png.ts` with `exportBoardAsPng(objects, boardName)` function
2. Calculate bounding box of all objects (min/max x/y + padding)
3. Create offscreen canvas sized to bounding box
4. Render all objects to offscreen canvas using existing renderers
5. `canvas.toDataURL('image/png')` → create download link → click → revoke
6. Wire MenuBar "Export as PNG" to call this function via context
7. Add `getCanvasRef` or similar to BoardContext so export can access the live canvas

**Simpler approach:** Since we already have a live `<canvas>` element, just use `canvasRef.toDataURL()` to capture the current viewport, or re-render to an offscreen canvas for full-board capture.

### 2B — Movable Color Palette (Issue 5)

**Files:**

- `apps/web/src/components/board/PropertyPanel.tsx` — add drag handling, custom color input, stroke/thickness controls
- `apps/web/src/hooks/useDraggable.ts` — NEW: reusable drag hook

**Steps:**

1. Create `useDraggable` hook: tracks mouse drag offset from initial position
2. Add drag handle (header area) to PropertyPanel
3. Replace `absolute bottom-4 right-4` with `absolute` + computed `left`/`top` from drag state
4. Add hex color input field with validation (`/^#[0-9a-fA-F]{6}$/`)
5. Add stroke color section (second row of swatches for border color)
6. Add line thickness dropdown (1, 2, 3, 5, 8 px)

---

## Batch 3: Complex Feature

### 3A — Connector Drawing Mode (Issue 2)

**Files:**

- `apps/web/src/hooks/interaction-modes/draw-connector-mode.ts` — full implementation
- `apps/web/src/app/board/[boardId]/page.tsx` — skip `createObject` for connector tool, add connector-specific state
- `apps/web/src/components/board/BoardCanvas.tsx` — render ghost line during connector drawing
- `apps/web/src/lib/board-store.ts` — add `createConnector(fromId, toId, fromPort, toPort)` method

**Steps:**

1. Add `createConnector` to board-store that creates a connector with proper `properties`
2. Add connector-drawing state: `{ sourceId: string | null, sourcePort: PortName | null }`
3. In `draw-connector-mode.onMouseDown`: hit-test objects, find nearest port, set as source
4. In `draw-connector-mode.onMouseMove`: compute ghost line from source port to cursor
5. In `draw-connector-mode.onMouseUp`: hit-test target object, find nearest port, create connector
6. Add port visualization: draw small circles on object edges when hovering with connector tool
7. Handle cancellation: Escape key or click on empty space resets source
8. Exclude connector tool from the generic `handleCanvasClick` → `createObject` path in page.tsx

**Port detection:** Given a mouse position near an object, pick the closest of the 4 edge ports (top/right/bottom/left).

---

## Agent Dispatch Sequence

```
Phase 1 (parallel): tdd-writer × 3 for Batch 1 (1A, 1B, 1C)
Phase 2 (parallel): implementer × 3 for Batch 1 (1A, 1B, 1C)
Phase 3: verifier for Batch 1
Phase 4 (parallel): tdd-writer × 2 for Batch 2 (2A, 2B)
Phase 5 (parallel): implementer × 2 for Batch 2 (2A, 2B)
Phase 6: verifier for Batch 2
Phase 7: tdd-writer for Batch 3 (connector mode)
Phase 8: implementer for Batch 3
Phase 9: verifier for Batch 3
Phase 10 (parallel): reviewer + security-auditor (all changes)
Phase 11: test-writer (coverage gaps)
Phase 12: committer
```

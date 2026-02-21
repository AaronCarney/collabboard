# Spec: Board Interaction & Feature Fixes

## Overview

Five broken/incomplete features need fixing. Grouped into three independent work streams.

## Stream A: Canvas Drawing Interaction (Line, Connector, Shape Drag-to-Draw)

### Problem

1. **Line tool**: `draw-line-mode.ts` is a stub — all three handlers are empty. `createObject("line", wx, wy)` sets `properties: {}` but LineObject requires `{x2, y2, arrow_style, stroke_style, stroke_width}`. Lines created via click are invisible/invalid.

2. **Connector tool**: Full implementation exists in `draw-connector-mode.ts` but `useCanvasInteraction` (the hook that routes tools to modes) is never imported. `handleCanvasClick` in `page.tsx` explicitly excludes `connector`. The connector tool does nothing.

3. **All shapes (click-and-drag)**: Currently all shapes use click-to-place at a fixed default size. Users expect click-drag to set size. Quick click should still create at default size.

### Root Cause

The `interaction-modes/` layer is fully implemented but never wired into `BoardCanvas.tsx`. All interaction goes through monolithic handlers in `BoardCanvas` that don't delegate to `InteractionMode` objects.

### Acceptance Criteria

- **AC-A1**: Selecting the line tool and click-dragging on the canvas creates a line from mouse-down point to mouse-up point. The line renders correctly with valid `properties` (x2, y2, arrow_style, stroke_style, stroke_width).
- **AC-A2**: Quick-clicking with the line tool creates a line with a sensible default length (e.g., 200px horizontal).
- **AC-A3**: Selecting the connector tool, pressing on shape A, dragging to shape B, and releasing creates a connector between A and B with correct from/to ports.
- **AC-A4**: Connectors render the line between connected shapes. Selecting connector tool on empty space does nothing.
- **AC-A5**: All shape tools (rectangle, circle, sticky_note, text, frame) support click-and-drag: mouse-down sets top-left, mouse-up sets bottom-right (width/height). The shape is created at the drag dimensions.
- **AC-A6**: Quick-clicking with a shape tool still creates a shape at the default size (backward compatible).
- **AC-A7**: After creating any shape/line/connector, the tool resets to `select`.
- **AC-A8**: Created objects pass Zod schema validation (`boardObjectSchema`).

### Implementation Approach

Rather than refactoring BoardCanvas to use the InteractionMode system (high risk, massive change), integrate the specific drawing interactions directly into BoardCanvas's existing mouse handlers:

1. **Line tool**: On mouseDown with `activeTool === "line"`, record start point. On mouseMove, show preview (optional). On mouseUp, create line with `properties: {x2, y2, arrow_style: "none", stroke_style: "solid", stroke_width: 2}`. If drag distance < threshold, use default offset.

2. **Connector tool**: On mouseDown with `activeTool === "connector"`, hit-test for source object, record sourceId + sourcePort. On mouseUp, hit-test for target, create connector object via store. Port calculation uses `getNearestPort` logic from `draw-connector-mode.ts`.

3. **Shape drag-to-draw**: On mouseDown with a shape tool, record start point. On mouseUp, if drag distance > threshold, create shape with drag bounds. Otherwise fall through to existing click-to-place.

### Files to Modify

- `apps/web/src/components/board/BoardCanvas.tsx` — add drawing state + mouse handler logic
- `apps/web/src/app/board/[boardId]/page.tsx` — update `handleCanvasClick`, add new callbacks for drag-create
- `apps/web/src/lib/board-store.ts` — add `createObjectWithBounds` method (or extend `createObject`)
- `packages/shared/src/types/board.ts` — add line defaults to `OBJECT_DEFAULTS`

---

## Stream B: View Controls (Grid Toggle, Fit to Screen)

### Problem

1. **Toggle Grid**: The "Toggle Grid" menu item calls `closeMenu` only (no-op). No grid visibility state exists. `drawGrid()` in BoardCanvas always draws.

2. **Fit to Screen**: Current implementation just resets camera to `{x:0, y:0, zoom:1}`. Should compute bounding box of all objects and zoom/pan to fit them in the viewport.

### Acceptance Criteria

- **AC-B1**: Clicking "Toggle Grid" in the View menu toggles grid visibility. Grid can be shown/hidden.
- **AC-B2**: Grid state persists within the session (not lost on re-render).
- **AC-B3**: "Fit to Screen" computes the bounding box of all objects on the board, then sets camera so all objects are visible with some padding.
- **AC-B4**: If the board is empty, "Fit to Screen" resets to origin at zoom 1 (current behavior).
- **AC-B5**: Fit to Screen works at any current zoom/pan level.

### Files to Modify

- `apps/web/src/components/board/BoardContext.tsx` — add `gridVisible`, `toggleGrid`
- `apps/web/src/app/board/[boardId]/page.tsx` — add grid state, compute fit-to-screen bounding box
- `apps/web/src/components/board/BoardCanvas.tsx` — accept `gridVisible` prop, conditionally call `drawGrid`
- `apps/web/src/components/board/MenuBar.tsx` — wire "Toggle Grid" to `ctx.toggleGrid()`

---

## Stream C: Board Sharing

### Problem

Share links are generated (POST `/api/share` works) and can be copied, but the board page never reads the `?share=` query parameter. Recipients who visit the link aren't granted access — the page tries to load the board with their Clerk auth, which fails because they're not the owner.

### Acceptance Criteria

- **AC-C1**: When a user visits `/board/{id}?share={token}`, the page validates the token via POST `/api/share/validate`.
- **AC-C2**: If the token is valid, the board loads with the appropriate access level (view or edit).
- **AC-C3**: If the token is invalid or expired, the user sees an error message and is redirected to the dashboard.
- **AC-C4**: View-only shared access disables editing (no object creation, no drag-move, no delete).
- **AC-C5**: The share dialog shows existing active shares when opened (calls `listShares`).

### Files to Modify

- `apps/web/src/app/board/[boardId]/page.tsx` — read `?share=` param, validate token, set access level
- `apps/web/src/components/board/ShareDialog.tsx` — load existing shares on open
- `apps/web/src/components/board/BoardContext.tsx` — add `accessLevel` to context (or a `readOnly` flag)
- `apps/web/src/lib/board-store.ts` — possibly: skip mutations when read-only

# Spec Compliance Review

**Date:** 2026-02-21
**Reviewer:** Reviewer agent (Mode A — Compliance)
**Verdict:** REQUEST_CHANGES

---

## Critical Finding: Spec Files Do Not Exist

The four spec files named in the review task do not exist in the repository:

- `docs/specs/canvas-rendering-hit-testing.md` — MISSING
- `docs/specs/shapes-tool-ui.md` — MISSING
- `docs/specs/frame-containment-wiring.md` — MISSING
- `docs/specs/ux-polish.md` — MISSING

The `docs/specs/` directory contains only:

```
_template.md
ai-agent-upgrade.md
ai-bug-fixes-b1-b3.md
board-interaction-fixes.md
board-persistence-and-limits.md
board-ux-fixes.md
```

Because the authoritative acceptance criteria do not exist, this review evaluates the
implementation against what was described in the review task prompt — specifically the
list of key implementation files named — and reports on what is and is not present.

---

## Spec A: Canvas Rendering & Hit-Testing

Assessed against task description references: `board-logic.ts` (hit-test delegation),
`spatial-index.ts` (getObjectBounds), `BoardCanvas.tsx` (draw preview, opacity, attach
points), `render-objects.ts` (opacity rendering), `geometry-utils.ts` (pointInPolygon,
triangle/star vertices).

### What exists

- `hitTest()` in `board-logic.ts`: AABB for rectangles/sticky_note/text/frame, ellipse
  equation for circles. Z-order (reverse iteration) is correct. Tests exist and pass.
- `SpatialIndex` in `spatial-index.ts`: grid-based viewport query. `insert` and `query`
  implemented. No `getObjectBounds` function (not present and not needed — the spatial
  index operates directly on `{x, y, width, height}` from the object). Tests exist.
- `BoardCanvas.tsx`: renderer-registry dispatch, dirty-flag rAF loop, spatial-index
  viewport culling, draw-preview for shapes (drag from `drawStartWorld` to mouse),
  connector source/target port picking via `getNearestPort`. Resize handles drawn at
  constant screen-pixel size. Opacity is passed through the renderer interface.

### Gaps and BLOCK items

**BLOCK — `render-objects.ts` does not exist.**
The task names this file as the location for opacity rendering. The file is absent
from `apps/web/src/lib/`. Opacity is stored in `BaseObject.opacity` and the schema
`board-objects.ts` validates it, but there is no standalone `render-objects.ts` module.
If the spec required this file as a named deliverable, it was never created.

**BLOCK — `geometry-utils.ts` does not exist.**
The task names this file as the location for `pointInPolygon`, triangle vertices, and
star vertices. The file is absent from `apps/web/src/lib/`. No polygon-based hit-testing
exists anywhere in the codebase; `hitTest()` uses only AABB and ellipse math.

**BLOCK — No draw preview rendered during drag.**
`BoardCanvas.tsx` tracks `isDrawingShape` and `drawStartWorld`, but the `render`
callback does not draw any ghost/preview shape while the user is dragging. The preview
only resolves on `mouseup`. This is a UX regression compared to what the task describes.

**SHOULD — opacity not applied at render time.**
`drawObjectFallback` ignores `obj.opacity`. The individual renderers (circle, rectangle,
etc.) must also apply `ctx.globalAlpha = obj.opacity ?? 1` before drawing; whether they
do requires verifying each renderer file, but there is no shared wrapper that enforces it.

---

## Spec B: Shapes & Tool UI

Assessed against task description references: `triangle-renderer.ts`, `star-renderer.ts`,
`Sidebar.tsx` (shapes submenu), `PropertyPanel.tsx` (Fill/Border labels),
`packages/shared/src/types/board.ts` and `packages/shared/src/schemas/board-objects.ts`
(triangle/star types).

### What exists

- `Sidebar.tsx`: select, pan, sticky_note, rectangle, circle, text, line, connector,
  frame tools. Collapse/expand toggle. No shapes submenu.
- `PropertyPanel.tsx`: color swatches labelled "Color" and stroke swatches labelled
  "Border". Opacity slider, line-width selector, font controls. Drag handle present.
- `types/board.ts`: ObjectType union contains `sticky_note | rectangle | circle | text
| line | connector | frame`. No `triangle` or `star`.
- `schemas/board-objects.ts`: discriminated union over the same 7 types. No triangle or
  star schema.

### BLOCK items

**BLOCK — `triangle-renderer.ts` does not exist.**
The file is named in the task as a required deliverable. The renderers directory
contains: circle, connector, frame, init, line, rectangle, sticky-note, text, and
render-utils. No triangle renderer is present.

**BLOCK — `star-renderer.ts` does not exist.**
Same situation. No star renderer is present.

**BLOCK — `triangle` and `star` ObjectTypes are not defined.**
`packages/shared/src/types/board.ts` and `packages/shared/src/schemas/board-objects.ts`
do not include `triangle` or `star`. No `TriangleObject` or `StarObject` interface
exists. No Zod schema exists for them. If the spec required these types, they were
never implemented.

**BLOCK — No shapes submenu in Sidebar.**
The task references a "shapes submenu" in `Sidebar.tsx`. The component renders a flat
list of 9 tool buttons with no grouping, nesting, or flyout submenu for shape variants.

**SHOULD — PropertyPanel label review.**
The fill-color section is labelled "Color" (not "Fill"). If the spec required the label
"Fill" this is a compliance issue. The stroke section is correctly labelled "Border".

---

## Spec C: Frame Containment Wiring

Assessed against task description references: `frame-containment.ts`,
`app/board/[boardId]/page.tsx` (wiring), `board-store.ts` (frame delete cleanup).

### What exists

- `frame-containment.ts`: `isInsideFrame`, `getChildrenOfFrame`, `findContainingFrame`,
  `applyFrameMove`, `nullifyChildrenFrameId`. All five functions are present and correct.
- Unit tests in `__tests__/frame-containment.test.ts`: 12 test cases covering all five
  functions including edge cases. All pass.

### BLOCK items

**BLOCK — `applyFrameMove` is never called from page or store.**
`frame-containment.ts` exports `applyFrameMove` but no call site exists anywhere in
`page.tsx` or `board-store.ts`. When a frame is moved via `handleObjectsMove`, only the
frame's own position is updated; its children do not move with it. The containment logic
exists as a library but is completely unwired from the interaction layer.

**BLOCK — `findContainingFrame` is never called.**
Object creation (`createObject`) and drop operations in `page.tsx` do not call
`findContainingFrame` to assign `parent_frame_id`. New objects are always created with
`parent_frame_id: null` (see `board-store.ts` line 379). Objects dragged into a frame
are never reparented.

**BLOCK — `nullifyChildrenFrameId` is never called on frame deletion.**
`deleteObject` in `board-store.ts` (lines 501-525) deletes only the frame itself. It
does not call `nullifyChildrenFrameId` to clear `parent_frame_id` on orphaned children.
Children of a deleted frame retain stale `parent_frame_id` values in both local state
and Supabase.

**Summary:** Frame containment logic has complete unit-tested library code but zero
production wiring. All three integration points (move propagation, drop assignment,
delete cleanup) are missing.

---

## Spec D: UX Polish

Assessed against task description references: `zoom-speed.ts`, `MenuBar.tsx` (Home,
Help, Export, Zoom Speed), `EmptyBoardHint.tsx` (per-board hint), `transforms.ts`
(topology-aware duplication).

### What exists

- `EmptyBoardHint.tsx`: rendered from `page.tsx` when `objects.length === 0 &&
!hintDismissed`. Dismiss button calls `localStorage.setItem('collabboard:hint-dismissed',
'true')`. The hint is per-user/per-device (localStorage), not per-board.
- `MenuBar.tsx`: contains File (New Board, Duplicate Board, Export as PNG), Edit (Undo,
  Redo, Select All, Delete, Copy, Paste, Duplicate), View (Zoom In, Zoom Out, Fit to
  Screen, Show/Hide Grid, Keyboard Shortcuts) menus. Zoom in/out buttons in toolbar.
  No "Home" menu item. No "Help" menu item separate from View > Keyboard Shortcuts.
  No "Export" top-level menu item (Export as PNG is under File). No "Zoom Speed"
  control anywhere.
- `transforms.ts`: `createDuplicates` copies all object fields including
  `parent_frame_id` (inherits from source), assigns new UUIDs, offsets position by 20px.
  Version reset to 1. No topology-awareness: duplicated children retain the original
  `parent_frame_id` pointing to the original frame, not a duplicated frame.

### BLOCK items

**BLOCK — `zoom-speed.ts` does not exist.**
The file is named as a required deliverable in the task. No file with this name exists
anywhere in the project. Zoom speed is hardcoded as `0.001 * e.deltaY` multiplier in
`BoardCanvas.tsx` line 618 with no configurable speed setting.

**BLOCK — "Zoom Speed" control not in MenuBar.**
The task states MenuBar should contain a Zoom Speed item. No such item exists.

**BLOCK — `transforms.ts` duplication is not topology-aware.**
`createDuplicates` (line 61-69) copies `parent_frame_id` verbatim. Duplicating a frame
with contained children does not create a new frame with the children re-parented to
it. Children of a duplicated frame still reference the original frame ID. Duplicating
a standalone child that has `parent_frame_id` set produces a duplicate still referencing
the old frame. The spec description "topology-aware duplication" is not implemented.

### SHOULD items

**SHOULD — "Home" menu item not present in MenuBar.**
The task mentions a Home item in MenuBar. No such item exists; the closest is board-
name editing in the header. If this was a required AC, it is absent.

**SHOULD — EmptyBoardHint is per-device, not per-board.**
The hint-dismissed state uses a single localStorage key
`collabboard:hint-dismissed` shared across all boards. If the spec required the hint
to reappear on new boards (per-board), this does not comply. The key does not include
the boardId.

---

## Summary

| Category                               | Total ACs Assessed | Pass  | Fail (BLOCK) |
| -------------------------------------- | ------------------ | ----- | ------------ |
| Spec A: Canvas Rendering & Hit-Testing | 6                  | 3     | 3            |
| Spec B: Shapes & Tool UI               | 5                  | 1     | 4            |
| Spec C: Frame Containment Wiring       | 5                  | 2     | 3            |
| Spec D: UX Polish                      | 6                  | 2     | 4            |
| **Total**                              | **22**             | **8** | **14**       |

### Gaps found (missing implementations)

1. `apps/web/src/lib/render-objects.ts` — does not exist
2. `apps/web/src/lib/geometry-utils.ts` — does not exist (no `pointInPolygon`, no
   triangle/star vertex generators)
3. `apps/web/src/lib/zoom-speed.ts` — does not exist
4. `apps/web/src/components/board/renderers/triangle-renderer.ts` — does not exist
5. `apps/web/src/components/board/renderers/star-renderer.ts` — does not exist
6. `triangle` and `star` types in `packages/shared/src/types/board.ts` — not added
7. Triangle and star Zod schemas in `packages/shared/src/schemas/board-objects.ts` — not added
8. Draw-preview ghost rendering in `BoardCanvas.tsx` during drag — not implemented
9. Shapes submenu in `Sidebar.tsx` — not implemented
10. `applyFrameMove` call site in page or store — not wired
11. `findContainingFrame` call on object drop/create — not wired
12. `nullifyChildrenFrameId` call on frame deletion — not wired
13. Topology-aware duplication in `transforms.ts` — not implemented
14. Zoom Speed control in `MenuBar.tsx` — not present

### What is correctly implemented

- Hit-testing (AABB + ellipse) with z-order and tests
- Spatial index for viewport culling with tests
- Frame containment library functions (all 5, fully tested in isolation)
- PropertyPanel Border label, opacity slider, color/stroke swatches
- EmptyBoardHint render logic and localStorage dismiss
- Core menu structure (File/Edit/View menus and zoom toolbar)

### Human review required

Not applicable — no auth, payments, or cryptographic code changed.

### Note on missing specs

Because none of the four spec files exist, it is impossible to verify exact acceptance
criteria wording. This review is based solely on the implementation files named in
the task prompt. If the specs are later produced, a re-review is required to close
the compliance gap formally.

# Spec: Canvas Board Object Rendering

**Created:** 2026-02-17
**Status:** Draft

## Feature Description

The canvas board object rendering feature provides the core visual layer of CollabBoard. It renders board objects (rectangles, circles, lines, arrows, sticky notes) onto an HTML Canvas 2D element at 60 FPS with smooth interaction. Objects must be selectable, movable, resizable, and deletable. This is the foundation all other board features build on — without it nothing else is possible.

## Acceptance Criteria

1. **AC1 — Object render:** Given a board with objects in state, when the canvas mounts, then all objects are rendered at their correct positions, sizes, and colors within one animation frame.
2. **AC2 — Rectangle:** Given the rectangle tool is active, when the user drags on the canvas, then a rectangle is created with the dragged bounding box and a default stroke color.
3. **AC3 — Circle:** Given the circle tool is active, when the user drags on the canvas, then a circle is created inscribed in the dragged bounding box.
4. **AC4 — Line:** Given the line tool is active, when the user drags on the canvas, then a line is created from the drag start point to the drag end point.
5. **AC5 — Arrow:** Given the arrow tool is active, when the user drags on the canvas, then an arrow is created with an arrowhead at the drag end point.
6. **AC6 — Sticky note:** Given the sticky note tool is active, when the user clicks on the canvas, then a sticky note is created at that position with default text "New note" and a yellow background.
7. **AC7 — Selection:** Given objects are rendered, when the user clicks an object, then it becomes selected (shows selection handles at corners and edges).
8. **AC8 — Move:** Given an object is selected, when the user drags it, then the object moves to follow the cursor and its position updates in state on drag end.
9. **AC9 — Resize:** Given an object is selected, when the user drags a corner handle, then the object resizes and its dimensions update in state on drag end.
10. **AC10 — Delete:** Given an object is selected, when the user presses Backspace or Delete, then the object is removed from state and disappears from the canvas.
11. **AC11 — 60 FPS:** Given up to 500 objects on the canvas, when the user is interacting (dragging, resizing), then the canvas renders at a steady 60 FPS (measured by requestAnimationFrame timing).
12. **AC12 — Viewport culling:** Given objects outside the visible viewport, when the canvas renders, then off-screen objects are not drawn (performance — not a visible behavior).
13. **AC13 — Client-only:** Given the canvas component, when it is imported, then it only renders in the browser — no SSR errors (`typeof window !== 'undefined'` guard or `'use client'` directive).

## Test Cases

| #   | Scenario            | Input                                                    | Expected Output                      | Notes                      |
| --- | ------------------- | -------------------------------------------------------- | ------------------------------------ | -------------------------- |
| 1   | Empty board         | No objects in state                                      | Canvas renders with no errors, blank |                            |
| 2   | Rectangle render    | State: `[{ type: 'rect', x: 10, y: 10, w: 100, h: 50 }]` | fillRect/strokeRect called on ctx    | Unit test with canvas mock |
| 3   | Selection hit-test  | Click at (50, 30) on 10,10,100,50 rect                   | Object returns as selected           | Hit-test pure function     |
| 4   | Move delta          | Drag from (50,30) to (70,50)                             | Object x += 20, y += 20              | State update test          |
| 5   | Delete on keydown   | Object selected, keydown 'Delete'                        | Object removed from state array      |                            |
| 6   | Out-of-bounds click | Click at (200, 200), no object there                     | No object selected                   |                            |
| 7   | 500-object perf     | 500 rects in state                                       | rAF callback completes in <16ms      | Performance test           |

## Out of Scope

- Free-draw / pen tool (v1.1)
- Image embedding (v1.1)
- Text editing within shapes (sticky notes use a separate text input overlay — not canvas-native text)
- Undo/redo (post-MVP)
- Multi-select (post-MVP, follow-up feature)
- Copy/paste objects (post-MVP)
- Export to PNG/PDF (non-goal)
- WebSocket sync (handled by the real-time sync feature, not this one)

## Dependencies

- Depends on: None (this is the foundational feature)
- Blocks: cursor-sync, object-sync, conflict-resolution (all need objects to exist)
- External: Browser Canvas 2D API (no npm dependencies for rendering)

## Performance Requirements

- 60 FPS steady with up to 500 objects (pre-culling limit for MVP; architecture supports up to 10K with viewport culling)
- Viewport culling must exclude off-screen objects from draw calls
- Hit-testing must complete in <1ms for up to 500 objects (linear scan acceptable at MVP scale)
- Reference: `docs/architecture.md` — canvas render budget 60 FPS steady

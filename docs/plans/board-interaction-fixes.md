# Plan: Board Interaction & Feature Fixes

## Work Streams & Parallelization

Three independent streams that can proceed in parallel through the TDD pipeline.

```
Stream A (Canvas Drawing)  ──┐
Stream B (View Controls)   ──┼── TDD → Implement → Verify (parallel)
Stream C (Board Sharing)   ──┘
                               │
                               ▼
                    Review + Security Audit (parallel, read-only)
                               │
                               ▼
                    Test-Writer (coverage gaps)
                               │
                               ▼
                         Commit (no push)
```

---

## Stream A: Canvas Drawing Interaction

### Phase 1: TDD (tdd-writer)

Write failing tests for:

- Line creation via click-and-drag (start/end coordinates → valid LineObject)
- Line creation via quick click (default size)
- Connector creation by drag from object A to object B
- Shape drag-to-draw (rectangle, circle, etc.)
- Quick-click still creates default-sized shapes
- Tool resets to "select" after creation
- Created objects pass Zod validation

Test location: `apps/web/src/lib/__tests__/canvas-drawing.test.ts`

Focus tests on pure logic functions (not React components):

- A `createLineObject(startX, startY, endX, endY, boardId, userId)` function
- A `createConnectorObject(sourceId, sourcePort, targetId, targetPort, boardId, userId)` function
- A `computeDragBounds(startX, startY, endX, endY, defaults)` function
- Zod validation of the resulting objects

### Phase 2: Implementation (implementer)

1. Add `createLineObject`, `createConnectorObject`, `computeDragBounds` to a new `apps/web/src/lib/canvas-drawing-utils.ts`
2. Update `OBJECT_DEFAULTS.line` in `packages/shared/src/types/board.ts` to include line properties
3. Update `BoardCanvas.tsx`:
   - Add state: `isDrawing`, `drawStart`, `drawTool`
   - In `handleMouseDown`: if tool is line/connector/shape, set drawing state, don't fall through to existing logic
   - In `handleMouseMove`: if drawing, track current position (for preview)
   - In `handleMouseUp`: if drawing, compute bounds/coordinates, call creation callback
4. Update `page.tsx`:
   - Add `handleDrawCreate` callback that creates objects with proper bounds/properties
   - For connector: hit-test source on mouseDown, hit-test target on mouseUp
5. Add `onDrawStart` and `onDrawEnd` callbacks to `BoardCanvasProps`

### Phase 3: Verify

`pnpm typecheck && pnpm lint && pnpm test && pnpm build`

---

## Stream B: View Controls

### Phase 1: TDD (tdd-writer)

Write failing tests for:

- `computeFitToScreen(objects, viewportWidth, viewportHeight, padding)` → returns `{x, y, zoom}`
- Empty objects array → returns default camera `{x:0, y:0, zoom:1}`
- Single object → camera centers on it with appropriate zoom
- Multiple scattered objects → bounding box fits in viewport
- Grid toggle state management

Test location: `apps/web/src/lib/__tests__/view-controls.test.ts`

### Phase 2: Implementation (implementer)

1. Add `computeFitToScreen` to `apps/web/src/lib/view-controls.ts`
2. Update `BoardContext.tsx`: add `gridVisible: boolean`, `toggleGrid: () => void`
3. Update `page.tsx`:
   - Add `gridVisible` state (default true)
   - Replace `fitToScreen` implementation with `computeFitToScreen` call
   - Pass `gridVisible` to BoardCanvas
4. Update `BoardCanvas.tsx`: accept `gridVisible` prop, conditionally call `drawGrid`
5. Update `MenuBar.tsx`: wire "Toggle Grid" to `ctx.toggleGrid()`

### Phase 3: Verify

`pnpm typecheck && pnpm lint && pnpm test && pnpm build`

---

## Stream C: Board Sharing

### Phase 1: TDD (tdd-writer)

Write failing tests for:

- `validateShareAccess(token)` → calls validate endpoint, returns access level or null
- Board page with valid share token → loads board
- Board page with invalid token → shows error
- Read-only mode disables mutations

Test location: `apps/web/src/lib/__tests__/share-access.test.ts`

### Phase 2: Implementation (implementer)

1. Update `page.tsx`:
   - Read `?share=` from `useSearchParams()`
   - On mount, if `share` param exists, validate via POST `/api/share/validate`
   - Store `accessLevel` in state (default: "edit" for owner, from token for shared)
   - Pass `readOnly` flag to BoardCanvas
2. Update `BoardContext.tsx`: add `readOnly: boolean` to context
3. When `readOnly`:
   - Disable tool selection (force "select" or "pan")
   - Disable `handleCanvasClick` creation
   - Disable delete, object move persistence
4. Update `ShareDialog.tsx`: call `listShares` on open to show existing shares

### Phase 3: Verify

`pnpm typecheck && pnpm lint && pnpm test && pnpm build`

---

## Post-Implementation (Sequential)

### Review + Security Audit (parallel, read-only)

- `reviewer`: spec conformance, code quality, test coverage
- `security-auditor`: XSS in share token handling, auth bypass in read-only mode, Zod validation of share tokens

### Test-Writer

- Coverage gaps, edge cases, regression scenarios

### Commit

- Conventional commit, no push

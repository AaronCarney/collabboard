# Plan: Canvas Board Object Rendering

**Source spec:** docs/specs/canvas-board-object-rendering.md
**Created:** 2026-02-17

## New Dependencies

| Package | Version | Purpose                                                            |
| ------- | ------- | ------------------------------------------------------------------ |
| None    | —       | Canvas 2D is browser-native; no npm deps needed for core rendering |

Verify before installing any future canvas lib: `npm view <package> version`

## Database Changes

None. Object state is managed in-memory in the Durable Object and synced via WebSocket. Supabase persistence is handled by the object-sync feature. This feature operates entirely client-side.

## Implementation Phases

### Phase 1: Schema & Types

**Commit:** `feat(shared): add board object Zod schemas and TypeScript types`

- [ ] Define `BoardObject` discriminated union in `packages/shared/src/schemas/board-object.ts`
  - `RectObject`, `CircleObject`, `LineObject`, `ArrowObject`, `StickyNoteObject`
  - Each has: `id: string`, `type: string`, `x: number`, `y: number`, `version: number`, `nonce: string`
  - Rect/Circle add: `width: number`, `height: number`, `fillColor: string`, `strokeColor: string`
  - Line/Arrow add: `x2: number`, `y2: number`, `strokeColor: string`
  - StickyNote adds: `width: number`, `height: number`, `text: string`, `backgroundColor: string`
- [ ] Export `BoardObjectSchema` (Zod union), `BoardObject` (inferred type)
- [ ] Write unit tests: parse valid objects, reject invalid shapes
- [ ] `pnpm typecheck` passes

### Phase 2: Rendering Engine

**Commit:** `feat(web): add canvas rendering engine for board objects`

- [ ] Create `apps/web/src/canvas/renderer.ts` — pure functions, no React:
  - `renderObject(ctx: CanvasRenderingContext2D, obj: BoardObject): void`
  - `renderAllObjects(ctx: CanvasRenderingContext2D, objects: BoardObject[], viewport: Viewport): void` (with culling)
  - `isInViewport(obj: BoardObject, viewport: Viewport): boolean`
- [ ] Create `apps/web/src/canvas/hit-test.ts`:
  - `hitTest(objects: BoardObject[], x: number, y: number): BoardObject | null`
  - `hitTestHandle(obj: BoardObject, x: number, y: number): ResizeHandle | null` (8 handles)
- [ ] Write unit tests for all pure functions (mock canvas ctx)
- [ ] `pnpm test` passes

### Phase 3: React Canvas Component

**Commit:** `feat(web): add BoardCanvas React component with interaction`

- [ ] Create `apps/web/src/components/board/BoardCanvas.tsx` (`'use client'`)
  - Refs: `canvasRef`, `animationFrameRef`
  - State: `objects`, `selectedId`, `activeTool`, `dragState`
  - `useEffect` → start rAF loop calling `renderAllObjects`
  - Cleanup: cancel rAF on unmount
- [ ] Mouse event handlers: `onMouseDown`, `onMouseMove`, `onMouseUp`
  - Down: hit-test → select, or begin create/drag
  - Move: update drag state (move or resize delta)
  - Up: commit change to objects state, dispatch mutation
- [ ] Keyboard handler: `onKeyDown` → Delete/Backspace removes selected object
- [ ] Tool palette component: `apps/web/src/components/board/ToolPalette.tsx`
  - Buttons: select, rect, circle, line, arrow, sticky-note
- [ ] `pnpm typecheck` passes; component renders in browser without SSR error

### Phase 4: Tests

**Commit:** `test(web): canvas rendering and interaction tests`

- [ ] Invoke `@test-writer`: "Read docs/specs/canvas-board-object-rendering.md, write failing Vitest tests for AC1–AC13. Do NOT implement. Use happy-dom canvas mock."
- [ ] Verify all new tests fail before implementation
- [ ] After implementation, all tests pass
- [ ] Add Playwright e2e: `tests/e2e/canvas.spec.ts`
  - Create a board, draw a rectangle, verify it appears
  - Select and move, verify new position

### Phase 5: Integration

**Commit:** `feat(canvas): complete board object rendering integration`

- [ ] Wire `BoardCanvas` into board page: `apps/web/src/app/board/[boardId]/page.tsx`
- [ ] Pass initial objects from tRPC query (stubbed for now — real sync in object-sync feature)
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` — all exit 0
- [ ] Manual smoke test: open board in browser, draw each shape type, select/move/delete
- [ ] Performance check: Chrome DevTools → Performance tab, 500 rects, verify 60 FPS

## Risks

| Risk                                        | Likelihood | Impact | Mitigation                                                                     |
| ------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------ |
| Canvas 2D ctx mocking in Vitest (happy-dom) | Med        | Med    | Use `vi.fn()` stubs for ctx methods; test pure renderer functions in isolation |
| SSR error on canvas mount                   | Med        | High   | `'use client'` directive + `typeof window` guard; test in Next.js dev mode     |
| rAF loop memory leak                        | Low        | Med    | Always cancel with `cancelAnimationFrame` in `useEffect` cleanup               |
| Hit-test inaccuracy at canvas scale         | Low        | Low    | Account for `devicePixelRatio` in coordinate transforms                        |

## Human Review Required

- [ ] No auth changes in this feature
- [ ] No database schema in this feature
- [ ] No new environment variables
- [ ] No WebSocket changes

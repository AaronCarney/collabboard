# CollabBoard — Implementation Plan

## Context

CollabBoard is a real-time collaborative whiteboard (Next.js 14, Clerk, Supabase, Canvas 2D). MVP shipped with working canvas, shapes (sticky notes, rectangles, circles, text), multi-select, real-time sync via Supabase Realtime broadcast, multiplayer cursors, Clerk auth, RLS, and 58 passing tests. Deployed on Vercel.

**What exists:** Pan/zoom/grid, create/move/resize/edit/delete objects, shift-click + rubber-band multi-select, dual Supabase client pattern (Clerk JWT for REST CRUD, anon key for broadcast/presence), presence bar with name labels. Existing `BoardCanvas.tsx` component with mouse handlers and canvas refs.

**What's missing:** AI agent (6+ commands, <2s, multi-step), lines/arrows/connectors/frames, rotate/copy/paste/duplicate, undo/redo, split toolbar + top menu bar, share link + basic access control, user customization (colors/themes/defaults), Zod validation at boundaries, shared packages (packages/db/ and packages/shared/ empty), e2e tests, LLM observability (LangSmith + LangFuse), AI provider evaluation, non-code deliverables (AI dev log, cost analysis, demo video, social post).

**Goal:** Complete, polished, interview-quality, submission-ready product that passes all evaluator tests. Target completion within ~4.5 days.

---

## Stakeholder Decision Log

Every phase must document design decisions in `docs/memory/DECISIONS.md` for the stakeholder report. Each decision records: context (why it came up), options considered, choice made, and rationale. This log serves as the source material for explaining at a high level why every major architectural and product decision was made.

Categories to capture:

- **Architecture:** Sync approach, data model, rendering strategy, API layer, AI integration pattern
- **Product:** UI layout, customization scope, sharing model, AI command design
- **Technology:** Provider selection, package choices, observability tooling
- **Process:** Testing strategy, parallelism approach, phase prioritization

---

## Architecture Decisions

### AD-1: Stay with Supabase Realtime (not Durable Objects)

**Do NOT migrate to Durable Objects.** Stay with the working Supabase Realtime broadcast approach.

| Factor              | Supabase Realtime (current)                           | Durable Objects                             |
| ------------------- | ----------------------------------------------------- | ------------------------------------------- |
| Status              | Working, deployed, tested                             | Empty scaffold (apps/realtime/)             |
| Migration effort    | 0                                                     | 2-3 days (kills the timeline)               |
| 5+ concurrent users | Proven                                                | Would need to build + test                  |
| 500 objects         | Works (broadcast is delta-based, objects in Postgres) | Slightly better (in-memory) but unnecessary |
| <100ms object sync  | Meets target via optimistic updates + broadcast       | Would also meet target                      |
| Conflict resolution | LWW via version field (already implemented)           | Same approach, just server-authoritative    |

**Why:** Evaluator tests require 5+ concurrent users, not 300. Supabase Realtime handles this. The project spec says "Use whatever stack helps you ship" — the working system ships.

**Action:** Update architecture.md invariant #2 and CLAUDE.md invariant #2 to reflect reality. Document in DECISIONS.md.

### AD-2: Direct Supabase + Service Layer (not tRPC)

**Do NOT adopt tRPC.** Use direct Supabase client calls wrapped in a thin service layer, plus plain Next.js API routes for server-side endpoints.

| API Surface                       | Approach                                                | Why                                                                                                                                                |
| --------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Board object mutations (hot path) | Direct Supabase in `board-store.ts`                     | tRPC adds an HTTP round-trip (50-200ms Vercel cold start) that violates <100ms sync. Optimistic update + broadcast happens in the same event tick. |
| Board CRUD (dashboard)            | Direct Supabase + `lib/board-service.ts`                | RLS handles auth. Service wrapper gives testability without network hop.                                                                           |
| AI command endpoint               | Next.js API route (`app/api/ai/command/route.ts`)       | Needs streaming (Vercel AI SDK), rate limiting (Upstash), Clerk auth (2 lines).                                                                    |
| Share link management             | Next.js API route (service role key needed server-side) | Low-frequency, server-only.                                                                                                                        |
| Real-time sync                    | Supabase Realtime broadcast (unchanged)                 | Incompatible with tRPC subscriptions.                                                                                                              |

**Type safety gap closed by:** `supabase gen types typescript` output in `packages/shared` + Zod validation at boundaries.

### AD-3: JSONB Properties Column (not wide table or separate tables)

**Use a single `properties jsonb` column** for type-specific data, with `parent_frame_id` as a dedicated FK column.

| Criterion                       | Wide Table                 | JSONB Props   | Separate Tables         |
| ------------------------------- | -------------------------- | ------------- | ----------------------- |
| Migration effort                | Low                        | **Lowest**    | High                    |
| TypeScript discriminated unions | Poor (10+ nullable fields) | **Excellent** | Good                    |
| Zod validation ergonomics       | Poor                       | **Excellent** | Good                    |
| Real-time broadcast compat      | Excellent                  | **Excellent** | **Poor** (breaks model) |
| Extensibility (future types)    | Moderate                   | **Excellent** | Moderate                |
| RLS complexity                  | Unchanged                  | **Unchanged** | Significantly worse     |

**Why:** Matches tldraw's production `props` pattern. After `z.discriminatedUnion("type", [...])` validation, TypeScript narrows to the exact variant — `LineObject.properties.x2` is `number`, not `number | null`. Zero null guards. Separate tables would require 7 Realtime subscriptions per board and fundamentally break the broadcast model.

**Hybrid detail:** `parent_frame_id` stays as a real FK column (needs `ON DELETE SET NULL` referential integrity). Everything else type-specific goes in `properties`.

---

## Interview Summary — Locked Design Decisions

| Decision           | Choice                                                                                   | Rationale for Stakeholder                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Toolbar layout     | Split: left sidebar (drawing tools) + top menu bar (File/Edit/View + board actions)      | Industry standard (Miro, Figma). Separates creation tools from board-level actions.                                   |
| AI command bar     | Bottom center (ChatGPT-style input)                                                      | Familiar interaction pattern. Non-intrusive — doesn't obscure canvas.                                                 |
| Visual style       | Professional/polished (Miro-like), clean blue/white, dark mode non-essential             | Enterprise-ready aesthetic. Blue primary (#2563EB) conveys trust/professionalism.                                     |
| Undo/redo          | Essential, full command pattern                                                          | Core whiteboard UX expectation. Command pattern enables multi-object undo.                                            |
| Sharing            | Link sharing first, invite-based roles in polish                                         | Link sharing covers evaluator tests. Invite system adds value but is not gated.                                       |
| AI provider        | Define model requirements from codebase + business needs first, then evaluate candidates | Requirements-driven selection. Vercel AI SDK makes provider swap trivial.                                             |
| LLM observability  | LangSmith + LangFuse both required                                                       | LangSmith for dev iteration (traces, evals). LangFuse for production monitoring (cost, latency). Complementary roles. |
| User customization | Object styling + board themes early; tool defaults + workspace layout in polish          | Styling is core UX. Defaults/layout are nice-to-have.                                                                 |
| Canvas refactor    | Extract shape renderers from existing BoardCanvas.tsx                                    | Enables parallel new-shape development and clean extensibility.                                                       |
| Agent teams        | Moderate parallelism via Claude Code agent teams                                         | Independent features on separate tracks. Agents also verify each other's work.                                        |
| Object store       | `Map<string, BoardObject>` replacing array                                               | O(1) lookups for connector resolution, selection, updates. Current `.find()` is O(n).                                 |

---

## Phase Breakdown

### Phase 1: Foundation — Packages + Canvas Refactor + Undo/Redo + Doc Alignment (~6 hours)

**Goal:** Bootstrap shared packages, extract shape renderers for extensibility, implement undo/redo, and align documentation with actual architecture.

**Deliverables:**

_Package Bootstrapping (prerequisite for all other work):_

- `packages/shared/`: `package.json` (`@collabboard/shared`), `tsconfig.json`, `src/index.ts` barrel export
- Move types from `apps/web/src/types/board.ts` to `packages/shared/src/types/board.ts`
- Create Zod schemas: `packages/shared/src/schemas/board-objects.ts` with `z.discriminatedUnion("type", [...])`
- `packages/db/`: `package.json` (`@collabboard/db`), Supabase client factory (thin wrapper)
- Wire both into `turbo.json` and `pnpm-workspace.yaml`
- Re-export from `@collabboard/shared` in `apps/web` — update existing imports
- Run `supabase gen types typescript` output into `packages/shared/src/types/database.ts`

_Doc Alignment (comprehensive — fix all stale references):_

- Update `architecture.md` invariant #2: Supabase Realtime = live sync authority (not DO)
- Update `architecture.md` invariants #6 and #7: remove DO-specific language ("DO WebSocket payloads", "The DO must enforce"). Reframe as general Supabase Realtime limits or remove entirely.
- Update `architecture.md` monorepo diagram: remove `apps/realtime/` DO structure (board-do.ts, wrangler.toml), fix `lib/` description (remove "tRPC client"), fix `packages/db/` description (remove "Prisma schema")
- Update `architecture.md` stack table: change "Hosting" row to remove "Cloudflare Workers", change "AI" row to "TBD — pending Phase 4A provider evaluation"
- Update `architecture.md` performance budget: change "Concurrent users/room: 300 max" to "5+ without degradation (spec target); stress test at 10"
- Update `architecture.md` invariant #8: clarify versioning is per-object (single `version` integer per BoardObject), not per-property. This matches the implemented LWW in `board-store.ts`.
- Update `CLAUDE.md` invariant #2 to match
- Update `docs/tech-stack.md`: API layer (direct Supabase + service layer), real-time (Supabase Realtime), remove Prisma
- Update `docs/tech-stack.md`: change "AI features: OpenAI 4.x" to "TBD — pending Phase 4A provider evaluation"
- Update `docs/tech-stack.md`: change hosting row to remove Cloudflare Workers reference
- Update `docs/tech-stack.md` conflict resolution section: clarify per-object versioning (not per-property). Remove `{ propertyName, value, version, nonce }` per-property payload description. Replace with: "Each object has a single `version` integer. All mutations send the full object state. Incoming updates accepted if `version >= existing`."
- Add tRPC, Prisma, and Cloudflare Durable Objects to `docs/tech-stack.md` rejection log with rationale (DO entry may already exist — verify before duplicating)
- Clean up `.env.example`: remove or comment out Cloudflare API TOKEN and ACCOUNT_ID placeholders

_Memory Protocol:_

- `docs/memory/` directory with STATUS.md, DECISIONS.md, GOTCHAS.md, SESSION-LOG.md
- `.claude/commands/session-end.md` slash command for post-session capture
- `collabboard-status.md` in gauntlet memory
- Seed DECISIONS.md with existing architecture decisions + AD-1 through AD-3
- Seed GOTCHAS.md with existing known gotchas (G001-G003)

_Canvas Refactor (refactor existing `BoardCanvas.tsx` in-place):_

- Extract shape renderers into `components/board/renderers/` (canonical location)
- Existing renderers extracted: `sticky-note-renderer.ts`, `rectangle-renderer.ts`, `circle-renderer.ts`, `text-renderer.ts`
- Each renderer exports: `draw()`, `hitTest()`, `getBounds()`, `getResizeHandles()`
- Registry: `renderer-registry.ts` maps ObjectType → renderer
- Convert object storage from `BoardObject[]` to `Map<string, BoardObject>` for O(1) lookups
- Viewport culling in render loop (only draw objects intersecting viewport)
- Add `.catch()` + toast notification on object mutation broadcasts (not cursors)

_Renderer Interface Contract:_

```typescript
// components/board/renderers/types.ts
export interface ShapeRenderer<T extends BoardObject = BoardObject> {
  /** Draw the object onto the canvas at world coordinates. */
  draw(ctx: CanvasRenderingContext2D, obj: T, isSelected: boolean): void;
  /** Return true if world-space point (wx, wy) is inside the object. */
  hitTest(obj: T, wx: number, wy: number): boolean;
  /** Return the axis-aligned bounding box in world coordinates. */
  getBounds(obj: T): { x: number; y: number; width: number; height: number };
  /** Return resize handle positions for the selection overlay. */
  getResizeHandles(obj: T): Array<{ id: string; x: number; y: number; cursor: string }>;
}
```

- All renderers are pure functions of `(ctx, object, state)` — no side effects, no refs, no hooks.
- Phase 3 agents add new renderers by creating a new file + one line in the registry — no existing file edits required.

_Registry Extension Pattern:_

```typescript
// components/board/renderers/renderer-registry.ts
import type { ShapeRenderer } from "./types";
import { stickyNoteRenderer } from "./sticky-note-renderer";
import { rectangleRenderer } from "./rectangle-renderer";
import { circleRenderer } from "./circle-renderer";
import { textRenderer } from "./text-renderer";

const registry = new Map<string, ShapeRenderer>([
  ["sticky_note", stickyNoteRenderer],
  ["rectangle", rectangleRenderer],
  ["circle", circleRenderer],
  ["text", textRenderer],
]);

export function registerRenderer(type: string, renderer: ShapeRenderer): void {
  registry.set(type, renderer);
}

export function getRenderer(type: string): ShapeRenderer {
  const r = registry.get(type);
  if (!r) throw new Error(`No renderer registered for type: ${type}`);
  return r;
}
```

- Phase 3 teammates call `registerRenderer()` from their module's init — avoids merge conflicts on the registry file.

_Interaction State Machine Extraction:_

- Extract interaction logic from `BoardCanvas.tsx` (lines 173-430: handleMouseDown/Move/Up) into `hooks/useCanvasInteraction.ts`
- Strategy pattern: each tool mode (select, pan, draw-shape, draw-line, draw-connector, draw-frame) is a separate handler object implementing:

```typescript
interface InteractionMode {
  onMouseDown(ctx: InteractionContext, e: CanvasMouseEvent): void;
  onMouseMove(ctx: InteractionContext, e: CanvasMouseEvent): void;
  onMouseUp(ctx: InteractionContext, e: CanvasMouseEvent): void;
  cursor: string; // CSS cursor for this mode
}
```

- `InteractionContext` provides: `camera`, `objects` (Map), `selectedIds`, `mutate()`, `selectObjects()`, `getRenderer()`
- Phase 3 agents add new interaction modes (line-draw, frame-draw, connector-draw) without touching BoardCanvas.tsx
- `BoardCanvas.tsx` reduces to: canvas ref + render loop + delegating events to active interaction mode

_BoardContext (React Context):_

- `components/board/BoardContext.tsx` — exposes board engine API to UI chrome (toolbar, menu bar, AI command bar)
- Prevents prop-drilling from `BoardCanvas.tsx` up through layout components

```typescript
interface BoardContextValue {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  selectedIds: Set<string>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  setZoom: (z: number) => void;
  fitToScreen: () => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  copySelected: () => void;
  pasteFromClipboard: () => void;
}
```

- Wraps the board page layout; both sidebar and menu bar consume it
- Keeps BoardCanvas.tsx focused on rendering; UI chrome focused on presentation

_Undo/Redo:_

- Command pattern: `UndoableCommand` interface with `execute()` and `undo()` methods
- History stack in board store: `past: Command[]`, `future: Command[]`
- Commands for: create, delete, move, resize, edit text, change color, multi-object operations
- Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Y / Ctrl+Shift+Z (redo)
- Undo/redo buttons in top bar
- Undo only applies to LOCAL operations — remote operations from other users are not in the local undo stack
- Guard clauses: verify target object still exists before undo (skip silently if deleted remotely), store full object snapshots (not deltas), cap stack at ~50 entries, clear stack on disconnect/reconnect
- ~15-20 new tests for undo/redo (including: basic undo/redo, undo after remote delete, undo multi-object ops, stack overflow, stack clear on disconnect)

_Command Interface + Mutation Pipeline:_

```typescript
// lib/board-commands.ts
interface UndoableCommand {
  /** Human-readable description for UI (e.g., "Move 3 objects") */
  description: string;
  /** Execute the command — applies the forward mutation */
  execute(): void;
  /** Reverse the command — applies the inverse mutation */
  undo(): void;
}
```

- **Unified mutation pipeline:** All state changes (user interactions, undo/redo, AI commands) flow through a single path:
  `mutate(change) → optimistic local update → broadcast to peers → persist to Supabase`
- This lives in `board-store.ts` as a `mutate(objects: BoardObject[])` function that:
  1. Updates the local Map (optimistic)
  2. Sends via Supabase Realtime broadcast
  3. Upserts to Supabase Postgres (async, fire-and-forget with `.catch()` + toast)
- Commands call `mutate()` in both `execute()` and `undo()` — never bypass the pipeline
- AI commands produce `UndoableCommand[]` — the AI result handler wraps them into the undo stack as a single compound command
- Remote mutations (received via broadcast) do NOT create commands — only local user actions do

_Zod Validation at Load + Broadcast (wired immediately, not deferred):_

- Wire `boardObjectSchema.parse()` on `loadObjects()` response in `board-store.ts`
- Wire `boardObjectSchema.parse()` on incoming broadcast payloads before applying to the Map
- This catches schema drift and corrupted data early — critical for JSONB properties column reliability

_AI SDK Installation (moved here from Phase 4 to enable early 4A):_

- Install `ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google` in Phase 1A
- This allows Phase 4A (provider evaluation) to start during Phase 2/3 without waiting for package setup

_Root Error Boundary:_

- Add React error boundary on the board page (`app/board/[id]/error.tsx`)
- Catches rendering errors in canvas, sidebar, or menu bar without crashing the entire app
- Shows "Something went wrong" with a retry button
- Logs error to console for debugging (later wired to observability in Phase 4C)

_Verification:_ All 58 existing tests + new undo/redo tests pass.

**Dependencies:** None (start here).
**Complexity:** L

_Phase 1 Test Breakdown:_
| Sub-phase | Test Type | What to Test | Where | What to Mock |
|-----------|-----------|-------------|-------|-------------|
| 1A (packages) | Unit | Zod schema validation (valid/invalid objects, discriminated union narrowing) | `packages/shared/src/schemas/__tests__/board-objects.test.ts` | Nothing — pure validation |
| 1A (packages) | Unit | Supabase client factory creates client with correct config | `packages/db/src/__tests__/client.test.ts` | `@supabase/supabase-js` createClient |
| 1B (renderers) | Unit | Each renderer's `draw()`, `hitTest()`, `getBounds()`, `getResizeHandles()` | `components/board/renderers/__tests__/<type>-renderer.test.ts` | `CanvasRenderingContext2D` (create mock with vi.fn()) |
| 1B (renderers) | Unit | Registry returns correct renderer, throws on unknown type | `components/board/renderers/__tests__/registry.test.ts` | Nothing — pure lookup |
| 1B (interaction) | Unit | Each interaction mode handles mouse events correctly | `hooks/__tests__/useCanvasInteraction.test.ts` | `InteractionContext` (mock mutate, selectObjects) |
| 1C (undo/redo) | Unit | Command execute/undo, stack push/pop, cap at 50, clear on disconnect | `lib/__tests__/board-commands.test.ts` | Board store's `mutate()` |
| 1C (undo/redo) | Integration | Undo after remote delete skips silently | `lib/__tests__/board-commands.test.ts` | Supabase broadcast |

**Parallelizable (with dependency chain):**

```
1A: Packages + Docs + Memory + AI SDK install
    ↓ (1B and 1C depend on shared types from 1A)
    ├── 1B: Canvas Refactor + Renderers + Interaction State Machine + BoardContext
    └── 1C: Undo/Redo + Mutation Pipeline + Zod Boundary Validation
```

- **1A must complete first** — 1B and 1C both import from `@collabboard/shared`
- **1B and 1C are independent** — can run in parallel after 1A
- **Interface contracts defined in 1A:** `ShapeRenderer`, `InteractionMode`, `UndoableCommand`, and `BoardContextValue` interfaces are written in 1A so 1B and 1C teammates know the target API without coordination
- Teammate A: Package bootstrapping + doc alignment + memory protocol + interface contracts + AI SDK install
- Teammate B: Canvas refactor (renderer extraction + interaction state machine + BoardContext + Map conversion + viewport culling + broadcast error handling)
- Teammate C: Undo/redo system (command pattern + mutation pipeline + history stack + Zod boundary validation + guard clauses + tests)

---

### Phase 2: UI Architecture — Split Toolbar + Top Menu Bar (~4 hours)

**Goal:** Restructure the UI into a professional Miro-like layout with split toolbar.

**Deliverables:**

_Left Sidebar (Drawing Tools):_

- Vertical tool palette: Select, Pan, Sticky Note, Rectangle, Circle, Text, Line, Connector, Frame
- Active tool highlighting
- Tool icons (Lucide icons or similar)
- Collapsible with keyboard shortcut

_Top Menu Bar:_

- Board name (editable inline)
- File menu: New Board, Duplicate Board, Export (PNG)
- Edit menu: Undo, Redo (disabled placeholders until Phase 1C wired), Select All, Delete Selected, Copy, Paste, Duplicate
- View menu: Zoom In, Zoom Out, Fit to Screen, Toggle Grid
- Share button (opens share dialog — Phase 5)
- Collaborator avatars (existing presence bar relocated)
- Zoom percentage indicator with +/- controls
- User menu (Clerk UserButton)

_AI Command Bar (Bottom Center):_

- Floating input with `/` prefix hint
- Collapsible/expandable
- Loading state during AI processing
- Result preview before applying

_General Polish:_

- Clean blue/white color scheme (#2563EB primary, white backgrounds, gray-50 canvas bg)
- Consistent 8px spacing grid
- Subtle shadows on floating elements
- Smooth transitions on tool switches and menu open/close

**Dependencies:** Phase 1B (canvas refactor for tool switching). Undo/redo buttons render as disabled placeholders and are wired when Phase 1C completes — Phase 2 does NOT block on Phase 1C.
**Complexity:** M

_Phase 2 Test Breakdown:_
| Sub-phase | Test Type | What to Test | Where | What to Mock |
|-----------|-----------|-------------|-------|-------------|
| 2A (sidebar) | Component | Tool buttons render, active tool highlighting, tool switch callback | `components/board/__tests__/Sidebar.test.tsx` | BoardContext |
| 2B (menu bar) | Component | Menu items render, keyboard shortcuts wired, undo/redo disabled state | `components/board/__tests__/MenuBar.test.tsx` | BoardContext |
| 2B (AI bar) | Component | AI command bar renders, submit fires callback, loading state | `components/board/__tests__/AiCommandBar.test.tsx` | BoardContext |

**Parallelizable:**

- Teammate A: Left sidebar + tool switching logic
- Teammate B: Top menu bar + menus + AI command bar shell

---

### Phase 3: Board Features — Lines, Frames, Connectors, Rotate, Copy/Paste (~6 hours)

**Goal:** Add all missing object types and operations required by the spec.

**Deliverables:**

_New Object Types:_

- `ObjectType` extended with `"line" | "connector" | "frame"` in `@collabboard/shared`
- Supabase migration adding JSONB properties column + parent_frame_id FK

_Line Renderer (`components/board/renderers/line-renderer.ts`):_

- Draw line/arrow between two points (base x,y + properties.x2, properties.y2)
- Arrowhead placement: none, end, both (stored in `properties.arrow_style`) — controls which endpoints get arrowheads
- Stroke style: solid, dashed, dotted (stored in `properties.stroke_style`) — controls line rendering
- Hit-test using point-to-segment distance
- 2-handle resize (start/end points)
- Stroke width and color customization (`properties.stroke_width`)

_Frame Renderer (`components/board/renderers/frame-renderer.ts`):_

- Dashed border with title bar
- Background layer (renders behind children)
- Child containment: drag objects into frame → set `parent_frame_id` on child
- Frame-move propagates position to all children (query `WHERE parent_frame_id = frame.id`)
- Frame-resize does NOT auto-resize children
- Title text editable inline (uses `content` field)

_Connector Renderer (`components/board/renderers/connector-renderer.ts`):_

- Resolves endpoints from attached objects via `Map.get(properties.from_object_id)` — O(1) lookup
- Snap-to-port: objects expose connection ports (top, right, bottom, left, center)
- Arrowhead rendering
- Delete connected object → detach connector (`properties.from_object_id` becomes stale, renderer handles gracefully)
- Connector follows source/target as they move

_Transforms:_

- Rotate: rotation handle above selection, rotation stored as degrees on object
- All renderers updated to apply rotation transform

_Operations:_

- Copy/Paste: Ctrl+C copies selected to clipboard (JSON), Ctrl+V pastes with offset
- Duplicate: Ctrl+D duplicates selected with 20px offset
- These create UndoableCommands (integrates with Phase 1 undo system)

_Render Order:_ Frames (back) → shapes/sticky notes/text → lines → connectors (front)

_Tests:_ ~40-50 new tests covering each renderer's draw, hitTest, and edge cases.

**Data model changes:**

```sql
-- Additive migration: existing rows unaffected, defaults applied automatically
ALTER TABLE board_objects
  ADD COLUMN properties jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN parent_frame_id uuid REFERENCES board_objects(id) ON DELETE SET NULL;

-- Extend type constraint for new object types
ALTER TABLE board_objects
  DROP CONSTRAINT IF EXISTS board_objects_type_check,
  ADD CONSTRAINT board_objects_type_check
    CHECK (type IN ('sticky_note', 'rectangle', 'circle', 'text', 'line', 'connector', 'frame'));

-- Indexes for common query patterns
CREATE INDEX idx_board_objects_parent_frame
  ON board_objects(parent_frame_id) WHERE parent_frame_id IS NOT NULL;
CREATE INDEX idx_board_objects_props_connector
  ON board_objects USING GIN (properties) WHERE type = 'connector';
```

**Migration strategy:** Deploy migration before new code. All new columns have defaults — existing rows get `properties = '{}'` and `parent_frame_id = NULL`. New code handles both old rows (empty properties) and new rows gracefully. Migration files go in `supabase/migrations/` with timestamps.

**TypeScript types (in `@collabboard/shared`):**

```typescript
interface BaseObject {
  id: string;
  board_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  content: string;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  parent_frame_id: string | null;
  properties: Record<string, unknown>;
}

interface LineObject extends BaseObject {
  type: "line";
  properties: {
    x2: number;
    y2: number;
    arrow_style: "none" | "end" | "both";
    stroke_style: "solid" | "dashed" | "dotted";
    stroke_width: number;
  };
}
interface ConnectorObject extends BaseObject {
  type: "connector";
  properties: {
    from_object_id: string;
    to_object_id: string;
    from_port: string;
    to_port: string;
    arrow_style: "none" | "end" | "both";
    stroke_style: "solid" | "dashed" | "dotted";
  };
}
interface FrameObject extends BaseObject {
  type: "frame";
  properties: Record<string, never>;
}
// Existing types: StickyNoteObject, RectangleObject, CircleObject, TextObject — properties: Record<string, never>

export type BoardObject =
  | StickyNoteObject
  | RectangleObject
  | CircleObject
  | TextObject
  | LineObject
  | ConnectorObject
  | FrameObject;
```

_Connector Creation UX + Port Resolution:_

- **Creation flow:** User selects connector tool → clicks source object → a ghost line follows the cursor → clicks target object → connector created
- **Port positions:** Each shape defines connection ports at `{ top, right, bottom, left, center }` relative to its bounds. Ports are derived from `getBounds()` — no stored port data.
- **Port resolution algorithm:**
  1. On connector creation: store `from_object_id`, `to_object_id`, `from_port`, `to_port` in properties
  2. On render: look up source/target objects from the Map → call `getBounds()` → compute port position from bounds + port name
  3. If source or target object is deleted: render connector as a dangling line (endpoint stays at last known position) and mark with a visual indicator (dashed, red tint)
- **Connector Zod schema:**

```typescript
const connectorPropsSchema = z.object({
  from_object_id: z.string().uuid(),
  to_object_id: z.string().uuid(),
  from_port: z.enum(["top", "right", "bottom", "left", "center"]),
  to_port: z.enum(["top", "right", "bottom", "left", "center"]),
  arrow_style: z.enum(["none", "end", "both"]),
  stroke_style: z.enum(["solid", "dashed", "dotted"]),
});
```

**Dependencies:** Phase 1 (renderer registry, Map-based store, shared packages).
**Complexity:** L

_Phase 3 Test Breakdown:_
| Sub-phase | Test Type | What to Test | Where | What to Mock |
|-----------|-----------|-------------|-------|-------------|
| 3A (lines) | Unit | Line draw with arrow styles, hit-test (point-to-segment), getBounds | `renderers/__tests__/line-renderer.test.ts` | CanvasRenderingContext2D |
| 3B (frames) | Unit | Frame draw, child containment logic, frame-move propagation | `renderers/__tests__/frame-renderer.test.ts` | CanvasRenderingContext2D |
| 3B (frames) | Integration | Set parent_frame_id on child, frame delete nullifies children's FK | `lib/__tests__/frame-containment.test.ts` | Supabase client |
| 3C (transforms) | Unit | Rotation math, copy/paste JSON serialization, duplicate offset | `lib/__tests__/transforms.test.ts` | Nothing — pure math |
| 3D (connectors) | Unit | Port resolution from bounds, dangling connector rendering | `renderers/__tests__/connector-renderer.test.ts` | CanvasRenderingContext2D |
| 3D (connectors) | Integration | Connector follows source/target on move, handles deletion | `lib/__tests__/connector-resolution.test.ts` | Board store |

_Phase 3 File Ownership (exclusive per teammate — no overlapping edits):_

| Teammate                   | Exclusive Files                                                                                                                          | Shared (read-only reference)                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| A (Lines)                  | `renderers/line-renderer.ts`, `renderers/__tests__/line-renderer.test.ts`, interaction mode for line tool                                | `renderer-registry.ts` (append via `registerRenderer()`), `@collabboard/shared` types |
| B (Frames)                 | `renderers/frame-renderer.ts`, `renderers/__tests__/frame-renderer.test.ts`, `lib/frame-containment.ts`, interaction mode for frame tool | `renderer-registry.ts` (append via `registerRenderer()`), `board-store.ts` (read Map) |
| C (Transforms)             | `lib/transforms.ts`, `lib/__tests__/transforms.test.ts`, rotation handle rendering in selection overlay                                  | `board-store.ts` (read for copy/paste), undo/redo (creates commands)                  |
| D (Connectors, sequential) | `renderers/connector-renderer.ts`, `renderers/__tests__/connector-renderer.test.ts`, interaction mode for connector tool                 | `renderer-registry.ts`, port definitions from A+B                                     |

- **Migration ownership:** A single teammate (A or B) owns the Supabase migration file. The migration adds ALL new columns/constraints at once — no parallel migration files.
- **Migration naming convention:** `YYYYMMDDHHMMSS_add_properties_and_frame_fk.sql` — timestamp prefix prevents collision. Only one migration per phase.

**Parallelizable:**

- Teammate A: Lines/arrows (types + renderer + toolbar + tests)
- Teammate B: Frames (types + renderer + containment + tests)
- Teammate C: Rotate + copy/paste/duplicate (transform logic + tests)
- Sequential after: Connectors (needs lines + frames both complete for port resolution)

---

### Phase 4: AI Agent — Provider Eval + Implementation + Observability (~8 hours)

**Goal:** Evaluate 3+ LLM providers, implement 6+ AI command types with the winner, wire observability.

**Sub-phase 4A: Provider Evaluation (~2 hours)**

_Can start during Phase 2/3 — does NOT depend on frames/connectors._

_Step 1 — Define Model Requirements (before researching candidates):_
Analyze the codebase and business requirements to define what the AI model must do:

- **Structured output:** Must reliably produce valid JSON matching Zod tool-call schemas (not free-text)
- **Tool calling:** Must support Vercel AI SDK's `generateText` / `streamText` with tool definitions
- **Latency:** <2s for single-step commands, <1.5s for template-like patterns (budget: ~300-800ms for LLM portion after auth + DB fetch)
- **Context window:** Must handle board state context (500 objects = ~50-100K tokens serialized) + system prompt + tool definitions
- **Cost ceiling:** Must be viable at scale (10K users, ~5 AI commands/user/month = 50K calls/month)
- **Multi-step:** Must chain 3-5 tool calls for complex commands (SWOT = 4-5 creates + positioning)
- **Accuracy:** Must produce valid coordinates, colors, and object relationships — hallucinated IDs break connectors

_Step 2 — Research and select 3+ candidates that match the requirements profile._

_Starting candidates (subject to change based on Step 1 analysis):_

1. OpenAI GPT-4o-mini via `@ai-sdk/openai`
2. Anthropic Claude Haiku via `@ai-sdk/anthropic`
3. Google Gemini Flash via `@ai-sdk/google`

_Step 3 — Evaluation protocol:_

- Build a provider-agnostic test harness using Vercel AI SDK
- Run 5 representative commands against each provider using existing object types:
  1. "Create a yellow sticky note that says 'User Research'" (simple creation)
  2. "Move all pink sticky notes to the right side" (board-aware manipulation)
  3. "Arrange these sticky notes in a 3x2 grid" (layout)
  4. "Create a SWOT analysis template" (multi-step complex — uses rectangles + text)
  5. "Group these items together" (spatial reasoning)

_Scoring criteria:_
| Criterion | Weight | How Measured |
|-----------|--------|-------------|
| Latency (must be <2s) | 30% | Avg response time across 5 commands |
| Structured output accuracy | 30% | Valid Zod-parseable JSON, correct tool calls |
| Cost per command | 20% | Token usage × price per token |
| Multi-step reliability | 20% | Correct sequential tool execution for SWOT |

_Output:_ `docs/research/ai-provider-eval.md` — requirements profile, comparison table, winner, rationale. This becomes a key artifact for the stakeholder report.
_Doc update:_ After selecting a winner, update `architecture.md` stack table AI row and `docs/tech-stack.md` AI features row with the chosen provider and version.

**Sub-phase 4B: AI Implementation (~4 hours)**

_Deliverables:_

- Tool definitions with Zod schemas: `lib/ai/tools.ts`
  - `createStickyNote(text, x, y, color)`
  - `createShape(type, x, y, width, height, color)`
  - `createFrame(title, x, y, width, height)`
  - `createConnector(fromId, toId, style)`
  - `moveObject(objectId, x, y)`
  - `resizeObject(objectId, width, height)`
  - `updateText(objectId, newText)`
  - `changeColor(objectId, color)`
  - `getBoardState()` — returns current board objects for context
- Command router: `lib/ai/command-router.ts`
- System prompt builder: `lib/ai/system-prompt.ts` (includes board state context)
- Pre-built templates: `lib/ai/templates.ts` (SWOT, Kanban, retrospective, brainstorm grid, user journey)
  - Templates bypass LLM entirely for speed (~100ms)
- API route: `app/api/ai/command/route.ts` (POST, Clerk auth, Upstash rate limiting)
- Rate limiting via `@upstash/ratelimit`:
  - Per-user: 10 commands/minute (sliding window)
  - Per-board: 30 commands/minute (prevents flooding shared boards)
  - Returns `429` with `Retry-After` header on limit
- AI results broadcast to all users via Supabase Realtime
- Multiple users issuing AI commands simultaneously without conflict
- ~20-25 tests

_API Route Request/Response Contract:_

```typescript
// POST /api/ai/command
// Request body:
const aiCommandRequestSchema = z.object({
  boardId: z.string().uuid(),
  command: z.string().min(1).max(1000),
  context: z
    .object({
      selectedObjectIds: z.array(z.string().uuid()).optional(),
      viewportCenter: z.object({ x: z.number(), y: z.number() }).optional(),
    })
    .optional(),
});

// Success response (200):
const aiCommandResponseSchema = z.object({
  success: z.literal(true),
  objects: z.array(boardObjectSchema), // created/modified objects
  message: z.string(), // human-readable summary (e.g., "Created SWOT template with 5 objects")
  tokensUsed: z.number(),
  latencyMs: z.number(),
  isTemplate: z.boolean(), // true if bypassed LLM
});

// Error response (4xx/5xx):
const aiCommandErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.enum(["RATE_LIMITED", "INVALID_COMMAND", "LLM_ERROR", "AUTH_ERROR", "BOARD_NOT_FOUND"]),
  retryAfter: z.number().optional(), // seconds, only for RATE_LIMITED
});
```

_AI Result Flow Through Mutation Pipeline:_

1. API route receives command → authenticates via Clerk → checks rate limit
2. Fetches board state from Supabase (objects for this board)
3. Calls LLM with board context + tool definitions (or matches template)
4. LLM returns tool calls → each tool call produces `BoardObject[]` mutations
5. API route persists new/modified objects to Supabase in a batch
6. API route broadcasts `{ type: 'ai:result', objects: [...] }` via Supabase Realtime
7. All connected clients receive broadcast → apply via `mutate()` pipeline → objects appear
8. The originating client wraps the AI result as a compound `UndoableCommand` — undo removes all AI-created objects
9. Non-originating clients see AI objects appear but do NOT add them to their undo stack (they're "remote" operations)

**Sub-phase 4C: LLM Observability (~2 hours)**

_LangSmith:_

- Traces every LLM call with input/output/latency/tokens
- Prompt versioning for iteration
- `lib/ai/observability/langsmith.ts`
- Env vars: `LANGCHAIN_API_KEY`, `LANGCHAIN_PROJECT`, `LANGCHAIN_TRACING_V2=true`

_LangFuse:_

- Cost tracking per user, per command type
- Latency dashboards
- Session-level analytics (which commands are used most)
- `lib/ai/observability/langfuse.ts`
- Env vars: `LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_HOST`

_Integration:_

- `lib/ai/observability/instrument.ts` — wraps LLM calls with both tracers
- Fire-and-forget: observability failures never block user response (`Promise.allSettled`)
- Both capture: prompt, completion, tokens, latency, user ID, command type, success/failure

_Latency budget (must be <2s):_
| Step | Estimate |
|------|----------|
| Clerk auth | 10-30ms |
| Board state fetch | 50-100ms |
| LLM (single tool call) | 300-800ms |
| LLM (multi-tool SWOT) | 600-1200ms |
| Supabase batch INSERT | 50-150ms |
| Supabase broadcast | 20-50ms (async) |
| Observability | 0ms (async, non-blocking) |
| **Total single-step** | **~500-1100ms** |
| **Total multi-step** | **~800-1500ms** |

Template commands bypass LLM: ~100-200ms.

**Packages to install:** `ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `langsmith`, `langfuse`, `@upstash/ratelimit`, `@upstash/redis`

**Dependencies:** Phase 1 (shared packages for Zod schemas). Phase 3 completion needed before 4B can wire `createFrame`/`createConnector` tools to real implementations, but tool definitions can be stubbed earlier.
**Complexity:** L

_Phase 4 Test Breakdown:_
| Sub-phase | Test Type | What to Test | Where | What to Mock |
|-----------|-----------|-------------|-------|-------------|
| 4A (eval) | Integration | Provider harness runs, results capture latency + accuracy | `lib/ai/__tests__/provider-eval.test.ts` | LLM providers (recorded responses for CI) |
| 4B (tools) | Unit | Each tool definition produces valid BoardObject, Zod schemas validate | `lib/ai/__tests__/tools.test.ts` | Nothing — pure object construction |
| 4B (router) | Unit | Command router selects correct tool, template matcher works | `lib/ai/__tests__/command-router.test.ts` | LLM call (mock with fixed response) |
| 4B (API route) | Integration | Auth check, rate limiting, end-to-end command flow | `app/api/ai/command/__tests__/route.test.ts` | Clerk auth, Upstash, LLM provider |
| 4C (observability) | Unit | Instrument wrapper calls both LangSmith + LangFuse, failures don't block | `lib/ai/observability/__tests__/instrument.test.ts` | LangSmith client, LangFuse client |

**Parallelizable:**

- 4A (eval) can start during Phase 2/3 — independent of new object types
- 4A must complete before 4B — need to know provider winner
- 4B and 4C can partially overlap: tool definitions (4B) are independent of observability wiring (4C)
- Teammate A: Provider eval harness + run eval + write results
- Teammate B (after A): Tool definitions + command router + templates + tests
- Teammate C (parallel with B): Observability wiring + API route + AiCommandBar UI

---

### Phase 5: Collaboration + Validation — Share Links, Zod Validation, User Customization (~4 hours)

**Goal:** Add board sharing via links and wire Zod validation at all system boundaries.

**Deliverables:**

_Share Link:_

- Share button in top bar opens share dialog
- Generate shareable link with configurable access: "Anyone with link can view" / "Anyone with link can edit"
- `board_shares` table: `id, board_id, access_level, token (uuid), created_by, created_at, expires_at`
- RLS policy: share token grants read or read+write access
- Public board route: `/board/[id]?share=[token]` — works without Clerk auth for viewers
- Token generation via Next.js API route (uses Supabase service role key — server-only)
- Copy link to clipboard button
- Revoke/regenerate link option

_RLS Policy Design for Share Tokens:_

- **How the token reaches RLS:** The share token is passed as a query parameter. The client-side code stores it in a React context. API calls to Supabase include the token as a custom header or RPC parameter.
- **Policy approach:** Two options evaluated:
  1. **RPC-based (chosen):** A server-side API route validates the share token via `board_shares` table lookup (using service role), then creates a short-lived Supabase session or returns data directly. The client never queries `board_objects` directly with the share token — the API route proxies the read.
  2. **Custom claim in JWT:** Rejected — would require a custom Supabase auth flow for anonymous share users, adding complexity.
- **RLS policies on `board_objects`:**
  - `SELECT`: owner via `auth.uid() = created_by` OR board member via `boards` table membership
  - `INSERT/UPDATE/DELETE`: owner via `auth.uid() = created_by` OR board member with edit access
  - Share token access is handled at the API route level (service role), not via RLS directly — simpler and more secure
- **RLS policy on `board_shares`:**
  - `SELECT`: only board owner can list shares (`auth.uid() = created_by`)
  - `INSERT/DELETE`: only board owner
- **Anonymous viewers:** Can see the board (read via API route) and see cursors (Supabase Realtime anon key), but cannot persist mutations unless `access_level = 'edit'`

_Zod Validation Wiring:_

- Schemas already defined in `@collabboard/shared` from Phase 1; this phase wires validation at boundaries:
  - `packages/shared/src/schemas/ai-commands.ts` — Zod schemas for AI request/response
  - `packages/shared/src/schemas/board-shares.ts` — Zod schemas for sharing
- Validation at: AI command input, Supabase data on read (parse responses), board object creation, share link creation

_User Customization (Phase 1 of 2):_

- Object styling: color picker, font size/family for text, border style, opacity slider
- Board themes: grid style (dots, lines, none), background color presets
- Settings stored per-board in Supabase, per-user preferences in localStorage

**Dependencies:** Phase 3 (all object types finalized, shared packages wired). Phase 5B AI command schemas require Phase 4B tool definitions. Share links (5A) and user customization (5C) are independent of Phase 4 and can start as soon as Phase 3 completes.
**Complexity:** M

_Phase 5 Test Breakdown:_
| Sub-phase | Test Type | What to Test | Where | What to Mock |
|-----------|-----------|-------------|-------|-------------|
| 5A (sharing) | Unit | Token generation, expiry validation, access level checks | `lib/__tests__/share-service.test.ts` | Supabase client |
| 5A (sharing) | Integration | Share API route: auth, token creation, revocation | `app/api/share/__tests__/route.test.ts` | Clerk auth, Supabase |
| 5B (validation) | Unit | Each Zod schema rejects malformed input | `packages/shared/src/schemas/__tests__/*.test.ts` | Nothing — pure validation |
| 5C (customization) | Component | Color picker renders, board theme applies | `components/__tests__/customization.test.ts` | localStorage |

_Migration Collision Prevention:_

- **Naming convention:** `YYYYMMDDHHMMSS_<description>.sql` — timestamp-prefixed, never manually numbered
- **One migration owner per phase:** Only one teammate creates migration files. Others communicate schema needs to the migration owner.
- **Phase 5 migration:** Single file `YYYYMMDDHHMMSS_add_board_shares.sql` — owned by Teammate A (share links)

**Parallelizable:**

- Teammate A: Share link (DB migration + dialog + API route + RLS)
- Teammate B: Zod validation wiring (boundary validation + additional schemas)
- Teammate C: User customization (color picker + board themes + persistence)

---

### Phase 6: Quality — E2E Tests + Performance Optimization (~4 hours)

**Goal:** Playwright e2e tests covering all evaluator scenarios + 500-object performance at 60fps.

**Deliverables:**

_E2E Tests (Playwright):_

- `e2e/collaboration.e2e.ts` — Two browser contexts, simultaneous editing, verify sync
- `e2e/persistence.e2e.ts` — Edit, refresh, verify state survives
- `e2e/performance.e2e.ts` — Rapid create/move of 20 objects, check no dropped operations
- `e2e/resilience.e2e.ts` — Network throttle (Slow 3G), disconnect/reconnect recovery
- `e2e/ai-commands.e2e.ts` — Issue AI command, verify objects appear for all users
- `e2e/concurrent.e2e.ts` — 5 browser contexts, all see each other's cursors + edits
- `e2e/stress.e2e.ts` — 10 browser contexts, verify no degradation (stress test beyond spec minimum)

_Evaluator Coverage Map:_
| Evaluator Test | E2E File |
|----------------|----------|
| 2 users editing simultaneously | collaboration.e2e.ts |
| Refresh mid-edit | persistence.e2e.ts |
| Rapid create/move | performance.e2e.ts |
| Network throttle + disconnect | resilience.e2e.ts |
| 5+ concurrent users | concurrent.e2e.ts |
| Stress test (10 users) | stress.e2e.ts |

_k6 Load Tests (WebSocket latency under load):_

- k6 script already exists at `load-tests/websocket-sync.js` with correct thresholds (cursor <50ms p95, object <100ms p95, connect <500ms p95)
- Prerequisite: install k6 binary (`sudo apt install k6` or download from k6.io)
- Run `pnpm test:load` to verify latency targets hold under sustained WebSocket load (20 VUs for 1 minute)
- k6 validates latency SLAs quantitatively; Playwright validates functional correctness. Both are needed.

_Performance Optimization:_

- Viewport culling tuned (from Phase 1, verify with 500 objects)
- Dirty-flag rendering: skip requestAnimationFrame when no state changes
- Object spatial index (simple grid-based) for O(1) viewport queries instead of O(n)
- Render benchmark: programmatically create 500 objects, measure FPS during pan/zoom
- Target: 60fps with 500 objects

**Dependencies:** Phases 1-5 (all features must exist to test them).
**Complexity:** M

**Parallelizable:**

- Teammate A: E2E test suite (Playwright)
- Teammate B: Performance optimization + benchmarking + k6 load test verification

---

### Phase 7: Polish + Non-Code Deliverables (~6 hours)

**Goal:** Submission-ready product with all graded deliverables complete.

**Deliverables:**

_Code Polish:_

- Error boundaries on all route segments
- Loading states (Suspense boundaries, skeleton screens)
- Empty board state (onboarding prompt)
- Keyboard shortcut help overlay (?)
- Toast notifications for actions (copied, shared, AI command complete)
- Favicon, Open Graph meta tags, page titles

_Non-Code Deliverables (all graded):_
| Deliverable | Format |
|-------------|--------|
| README.md | Setup guide, architecture overview, deployed link, screenshots |
| AI Development Log | Tools used, MCP usage, effective prompts, code %, strengths/limitations, learnings |
| AI Cost Analysis | Actual dev spend (from LangFuse/LangSmith) + projections for 100/1K/10K/100K users |
| Demo Video (3-5 min) | Real-time collaboration, AI commands, architecture explanation |
| Social Post | X or LinkedIn — description, features, demo/screenshots, tag @GauntletAI |

_Stretch (if time permits):_

- Invite-based sharing with roles (viewer, editor, admin)
- Tool defaults: default sticky note color, shape size, font
- Workspace layout preferences
- Dark mode

**Dependencies:** Phases 1-6 complete.
**Complexity:** M

---

## Critical Path

```
Phase 1 (parallel):
  ┌─ 1A: Packages + Docs + Memory ──────────────┐
  ├─ 1B: Canvas Refactor + Map + Error Handling ─┤
  └─ 1C: Undo/Redo System ──────────────────────┤
                                                  ▼
Phase 2 (parallel, starts after 1B; does NOT wait for 1C):
  ┌─ 2A: Left Sidebar ──────────────────────────┐
  └─ 2B: Top Menu Bar + AI Bar Shell ───────────┤
                                                  ▼
Phase 3 (parallel, then sequential):            Phase 4A (can start during Phase 2/3):
  ┌─ 3A: Lines/Arrows ─────────────────┐         ── Provider Evaluation ──────────┐
  ├─ 3B: Frames ───────────────────────┤                                          │
  ├─ 3C: Rotate + Copy/Paste ──────────┤                                          │
  └─ 3D: Connectors (after A+B) ──────┤                                          │
                                        ▼                                          ▼
                              Phase 4B+4C (after 4A; 4B wires stubs to real types after Phase 3):
                                ┌─ 4B: AI Implementation ────────────────────────┐
                                └─ 4C: LLM Observability (parallel with B) ──────┤
                                                                                  ▼
Phase 5 (parallel; 5A+5C can start after Phase 3, 5B AI schemas need Phase 4B):
  ┌─ 5A: Share Links ───────────────────────────┐
  ├─ 5B: Zod Validation Wiring ────────────────┤
  └─ 5C: User Customization ───────────────────┤
                                                  ▼
Phase 6 (parallel):
  ┌─ 6A: E2E Tests ─────────────────────────────┐
  └─ 6B: Performance Optimization ──────────────┤
                                                  ▼
Phase 7: Polish + Non-Code Deliverables ─────────╝
```

Key improvements over original critical path:

- Phase 2 no longer blocked on Phase 1C (undo/redo) — saves ~2-3 hours
- Phase 4A (provider eval) starts during Phase 2/3 — saves ~4-6 hours on critical path
- Phase 5A (share links) + 5C (customization) can start after Phase 3, parallel with Phase 4 — saves ~2-4 hours
- At peak, 3-4 agent teammates work simultaneously on independent tracks

---

## Risk Register

| #   | Risk                                        | Impact                                              | Prob | Mitigation                                                                                                                                             |
| --- | ------------------------------------------- | --------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **LLM latency exceeds 2s**                  | AI commands fail evaluator timing                   | Med  | Template bypass for known patterns (SWOT, Kanban, retro) runs in ~100ms without LLM. Monitor via LangFuse.                                             |
| 2   | **Connector complexity eats into AI phase** | Phase 3 overruns                                    | Med  | Connectors are lowest-priority shape. Ship lines + frames first, defer connectors if behind.                                                           |
| 3   | **Provider eval takes >2 hours**            | Delays AI implementation                            | Med  | Cap eval at 2 hours. Default to GPT-4o-mini if inconclusive. Vercel AI SDK makes swap trivial.                                                         |
| 4   | **E2E tests flaky with Clerk**              | Tests unreliable during evaluation                  | Med  | Clerk test mode or dedicated test accounts. Auth bypass for e2e if needed.                                                                             |
| 5   | **Undo/redo + real-time sync conflict**     | Undo undoes another user's action                   | Med  | Undo only LOCAL operations. Guard clauses: verify object exists, store full snapshots, cap stack, clear on disconnect.                                 |
| 6   | **JSONB partial update complexity**         | Properties can't be partially updated via PostgREST | Low  | LWW model sends full object state on broadcast. DB updates send full `properties` object. For partial updates, use `jsonb_set()` via Supabase `rpc()`. |

---

## Memory Protocol Design

### File Layout

**Project level** (`~/projects/collabboard/docs/memory/`):

| File             | Purpose                                              | Max Size              |
| ---------------- | ---------------------------------------------------- | --------------------- |
| `STATUS.md`      | Current phase, blockers, in-progress work, env state | ~40 lines             |
| `DECISIONS.md`   | Numbered architectural decisions (append-only)       | Archive at 40 entries |
| `GOTCHAS.md`     | Numbered gotchas with category tags (append-only)    | Archive at 60 entries |
| `SESSION-LOG.md` | Per-session summaries, reverse chronological         | Archive at 100 lines  |
| `archive/`       | Consolidated older entries                           | Read-only             |

**Gauntlet level** (`/home/context/.claude/projects/-home-context-gauntlet/memory/`):

| File                    | Purpose                           | Max Size  |
| ----------------------- | --------------------------------- | --------- |
| `MEMORY.md`             | System prompt index (auto-loaded) | 200 lines |
| `collabboard-status.md` | 1-paragraph sprint summary        | ~10 lines |

**Slash command:** `.claude/commands/session-end.md` — post-session capture checklist

### Session Start Protocol (any agent / teammate)

| Step      | File                               | ~Tokens    |
| --------- | ---------------------------------- | ---------- | --------------------------------------------- |
| 1         | `MEMORY.md`                        | 400        | Auto-loaded. Project location + key gotchas.  |
| 2         | `collabboard/CLAUDE.md`            | 700        | Project rules and architecture invariants.    |
| 3         | `docs/memory/STATUS.md`            | 400        | Current phase, blockers, what to work on.     |
| 4         | `docs/memory/GOTCHAS.md`           | 400        | Scan headings, avoid repeating past mistakes. |
| 5         | Relevant `docs/specs/<feature>.md` | 500        | Acceptance criteria for current work.         |
| 6         | Relevant `docs/plans/<feature>.md` | 600        | Implementation steps.                         |
| **Total** |                                    | **~3,000** | Minimal context, maximum productivity.        |

### Post-Session Checklist

1. Update `STATUS.md` — current phase, blockers, next priorities
2. Append to `SESSION-LOG.md` — what was done, files touched, decision/gotcha refs
3. Append to `DECISIONS.md` (if decisions made) — numbered, context/options/outcome
4. Append to `GOTCHAS.md` (if gotchas discovered) — numbered, category, fix
5. Update `MEMORY.md` key gotchas (if broadly applicable)
6. Update `collabboard-status.md` (gauntlet memory)
7. Archival check — consolidate if any file exceeds its threshold

### Design Principles

- **IDs are permanent** — D001 is always D001, G007 is always G007, across archival
- **Append-only** — DECISIONS and GOTCHAS are never edited, safe for concurrent agents
- **Thin gauntlet layer** — Only pointers and universal gotchas in MEMORY.md
- **Zero lost decisions** — Any teammate discovers something, it persists for all future sessions
- **Scales** — Archival triggers keep active files small; archive is read-only reference
- **Agent-team compatible** — Multiple teammates read simultaneously, append-only prevents conflicts

---

## Packages to Install

```bash
# Phase 1A: AI agent layer (installed early to enable Phase 4A during Phase 2/3)
pnpm add ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google

# Phase 4B/4C: LLM observability + rate limiting
pnpm add langsmith langfuse @upstash/ratelimit @upstash/redis

# Already installed: zod, @supabase/supabase-js, @clerk/nextjs
```

All packages verified as real npm packages.

---

## Verification Protocol

After every phase:

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Before submission — evaluator scenario verification:

1. 2 browsers, simultaneous editing, verify sync
2. Refresh mid-edit, verify state persists
3. Rapid creation/movement of 20 objects, verify all sync
4. Network throttling → Slow 3G, disconnect → reconnect → verify recovery
5. 5 browser tabs, verify no degradation (spec minimum)
6. 10 browser tabs, verify no degradation (stress test)
7. 500 objects on board, verify 60fps pan/zoom
8. AI command in one browser, objects appear in all browsers
9. LangFuse dashboard shows cost data → feed into cost analysis
10. Share link works in incognito window
11. Deployed Vercel URL accessible publicly
12. `pnpm test:load` — k6 WebSocket latency thresholds pass (cursor <50ms p95, object <100ms p95)

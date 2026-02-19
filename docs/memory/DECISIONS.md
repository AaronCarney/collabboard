# Architectural Decisions — CollabBoard

Append-only log. IDs are permanent across archival. Format: context, options, choice, rationale.

---

## D001 — Conflict Resolution: Last-Write-Wins with Version Numbers

**Date:** 2026-02-14
**Category:** Architecture
**Context:** Real-time collaboration requires a conflict resolution strategy when two users edit the same object simultaneously. Three approaches considered.
**Options:**

1. **CRDTs (Yjs):** Character-level merge, zero data loss. But adds 5,000-15,000 LOC, unbounded tombstone growth (10MB+ after thousands of edits), and is overkill for discrete objects. Only Figma-scale rich text justifies the complexity.
2. **Server-authoritative with operational transform:** Server resolves all conflicts. Requires a dedicated stateful server (Durable Object or similar). Adds latency — every mutation round-trips before applying.
3. **Last-Writer-Wins with version numbers:** Each object has a monotonically increasing version. Concurrent edits: highest version wins. Tie-breaking via random nonce. Simple (50 LOC), predictable, handles 99.9% of cases.
   **Choice:** Option 3 — LWW with version numbers.
   **Rationale:** The probability of two users editing the same property of the same discrete object is near zero. The 0.1% failure case (simultaneous drag of one sticky note) is low-stakes — user simply re-drags. This is the approach used by Figma and Excalidraw in production. CRDT reserved only for rich text editing (Yjs + TipTap) if needed later.

---

## D002 — Rendering: Canvas 2D API

**Date:** 2026-02-14
**Category:** Architecture
**Context:** Whiteboard rendering technology selection. Must hit 60fps with 500+ objects.
**Options:**

1. **SVG:** DOM-based, easy to style. Hits DOM limits at 1,000+ nodes, 30-60fps.
2. **Canvas 2D:** Imperative drawing, native browser API. 60fps for 1,000-10,000 objects with viewport culling.
3. **WebGL (PixiJS):** GPU-accelerated, 60fps for 10,000-100,000+ objects. Requires shader knowledge.
   **Choice:** Option 2 — Canvas 2D.
   **Rationale:** Our target is 500+ objects, not 50,000. Canvas 2D achieves 60fps at this scale with viewport culling and no library dependencies. WebGL is overkill and adds complexity. SVG would struggle at scale. Canvas 2D is the sweet spot per pre-search analysis.

---

## D003 — Real-time Sync: Supabase Realtime Broadcast (not Durable Objects)

**Date:** 2026-02-17
**Category:** Architecture
**Context:** The architecture.md and pre-search recommended Cloudflare Durable Objects as the live state authority. However, the MVP was built and shipped using Supabase Realtime broadcast with optimistic updates. The `apps/realtime/` DO scaffold is empty (just a `package.json`).
**Options:**

1. **Migrate to Durable Objects:** Server-authoritative, in-memory state, global edge. But: 2-3 day migration during a 4.5-day sprint. Rebuilds a working system for marginal benefit (the spec requires 5+ users, not 300).
2. **Stay with Supabase Realtime:** Working, deployed, tested. Dual client pattern (Clerk JWT for REST CRUD, anon key for broadcast/presence). Meets all performance targets: <100ms sync via optimistic updates, 5+ concurrent users proven.
   **Choice:** Option 2 — Stay with Supabase Realtime.
   **Rationale:** The project spec says "A simple, solid, multiplayer whiteboard with a working AI agent beats any feature-rich board with broken collaboration." Rewriting the sync layer is the highest-risk, lowest-reward move. Evaluator tests require 5+ concurrent users — Supabase Realtime handles this. DOs would be justified at 50+ concurrent users per room, which is a post-submission optimization.

---

## D004 — API Layer: Direct Supabase + Service Layer (not tRPC)

**Date:** 2026-02-18
**Category:** Architecture
**Context:** The architecture.md and pre-search specified tRPC as the API layer for end-to-end type safety. But no tRPC exists in the codebase — the MVP uses direct Supabase client calls. The question: adopt tRPC now, or formalize the current pattern?
**Options:**

1. **Full tRPC adoption:** Maximum type safety, React Query integration via generated hooks. But: 24-36 hours of migration work (setup, routers, refactoring existing calls, testing). Adds latency to the hot path — object mutations during collaboration would round-trip through a Vercel serverless function (50-200ms cold start) before persisting, violating the <100ms sync target. The real-time broadcast layer is incompatible with tRPC subscriptions.
2. **tRPC for new features only:** Add tRPC for AI commands and share links. Creates a split architecture (some tRPC, some direct). Confusing for developers and agents.
3. **Direct Supabase + thin service layer + Next.js API routes:** Keep direct Supabase calls for board operations (the hot path stays fast). Extract to `lib/board-service.ts` for testability. Use plain Next.js API routes for server-side endpoints (AI commands, share token generation). Close the type safety gap with `supabase gen types typescript` + Zod validation at boundaries.
   **Choice:** Option 3 — Direct Supabase + service layer + API routes.
   **Rationale:** tRPC's primary value (type-safe RPC) is already achieved via Supabase's generated types + Zod. Its secondary value (React Query hooks) adds a network hop that actively harms the hot path. The AI endpoint needs streaming (Vercel AI SDK's `streamText`), rate limiting (Upstash middleware), and Clerk auth — all of which integrate more naturally with plain Next.js route handlers than tRPC procedures. Migration cost (24-36 hours) exceeds remaining sprint budget.

---

## D005 — Data Model: JSONB Properties Column with parent_frame_id FK

**Date:** 2026-02-18
**Category:** Architecture
**Context:** Adding lines, connectors, and frames requires type-specific fields (x2/y2 for lines, from_object_id/to_object_id for connectors, etc.) that don't apply to existing shapes.
**Options:**

1. **Wide table with nullable columns:** Add ~10 nullable columns to `board_objects`. Simple migration, all data SQL-queryable. But: TypeScript types have `number | null` on every object for every field. Zod validation must handle many optional fields. Adding future types requires more ALTER TABLEs.
2. **JSONB properties column:** Keep common columns on the table. Add a single `properties jsonb DEFAULT '{}'` for type-specific data. Zod `z.discriminatedUnion("type", [...])` validates the JSON by type. Clean TypeScript narrowing: `LineObject.properties.x2` is `number`, not `number | null`.
3. **Separate tables per type:** `board_lines`, `board_connectors`, `board_frames` with FKs to base `board_objects`. Normalized, clean per-type queries. But: "get all objects for a board" requires UNION ALL across 7+ tables. Supabase Realtime would need 7 subscriptions per board. RLS policies multiply (28+ policies). Fundamentally breaks the single-table broadcast model.
   **Choice:** Option 2 — JSONB properties column, with `parent_frame_id` as a dedicated FK.
   **Rationale:** Matches tldraw's production `props` pattern. After Zod discriminated union validation, TypeScript narrows to the exact variant — no null guards. Lowest migration cost (one ALTER TABLE). Zero impact on the broadcast layer (payload gains a `properties` field, clients unwrap after validation). Excellent extensibility (adding "image" or "drawing" types requires zero schema migrations). `parent_frame_id` kept as a real FK column because frame membership needs referential integrity (`ON DELETE SET NULL`).

---

## D006 — Remove child_ids Array, Derive from parent_frame_id

**Date:** 2026-02-18
**Category:** Architecture
**Context:** The original plan included a `child_ids uuid[]` array on frame objects to track contained children. This duplicates the `parent_frame_id` FK on child objects.
**Options:**

1. **Keep both:** `child_ids` on frame + `parent_frame_id` on children. Fast lookup in both directions. But: concurrent users could desync the two — updating `parent_frame_id` on a child without updating the frame's `child_ids` creates an inconsistent state. Requires transactions that Supabase broadcast can't guarantee.
2. **parent_frame_id only:** Single source of truth. Query children with `WHERE parent_frame_id = frame.id`. Indexed for performance. No consistency risk.
   **Choice:** Option 2 — `parent_frame_id` only.
   **Rationale:** Standard relational modeling. A dual-source invariant is impossible to enforce with concurrent users and eventual consistency. The query `WHERE parent_frame_id = frame.id` with a partial B-tree index is sub-millisecond for any realistic board size.

---

## D007 — Object Store: Map Instead of Array

**Date:** 2026-02-18
**Category:** Architecture
**Context:** The board store (`board-store.ts`) uses `BoardObject[]` with `.find()` and `.findIndex()` for lookups. With connectors resolving endpoints per frame (60fps), this becomes O(connectors x objects) per render.
**Options:**

1. **Keep array:** Simple, works for current object count. But: O(n) per lookup degrades with 500+ objects and connectors.
2. **Map<string, BoardObject>:** O(1) lookups by ID. Connector resolution becomes constant-time. Selection, updates, and deletes also benefit.
   **Choice:** Option 2 — `Map<string, BoardObject>`.
   **Rationale:** Strictly better for all operations. The array pattern was fine for MVP but doesn't scale to 500+ objects with connectors. The Map is also more natural for the LWW merge (key by ID, compare versions).

---

## D008 — Phase Decoupling: UI Work Independent of Undo/Redo

**Date:** 2026-02-18
**Category:** Process
**Context:** Phase 2 (UI architecture) was originally blocked on Phase 1 (undo/redo) because "Edit menu needs undo/redo actions." This serializes ~9 hours of work unnecessarily.
**Options:**

1. **Keep dependency:** Phase 2 waits for Phase 1C to complete. Simple but wastes 2-3 hours.
2. **Decouple:** Phase 2 UI starts after Phase 1B (canvas refactor). Edit menu's Undo/Redo buttons render as disabled placeholders, wired when Phase 1C completes.
   **Choice:** Option 2 — Decouple.
   **Rationale:** The UI layout (sidebar, menu bar, AI command bar) has zero architectural coupling to the undo/redo system. Disabled placeholder buttons are a standard UI pattern. This saves 2-3 hours on the critical path.

---

## D009 — Phase Decoupling: AI Provider Eval Independent of New Object Types

**Date:** 2026-02-18
**Category:** Process
**Context:** Phase 4A (AI provider evaluation) was originally blocked on Phase 3 (lines/frames/connectors) because "frames needed for SWOT template evaluation." This adds ~6 hours to the critical path.
**Options:**

1. **Keep dependency:** Run eval after all new types are implemented. SWOT template eval uses real frames.
2. **Decouple:** Run eval during Phase 2/3 using existing object types (rectangles + text for SWOT quadrants). Stub `createFrame` tool definition. Wire to real types after Phase 3.
   **Choice:** Option 2 — Decouple.
   **Rationale:** The provider evaluation tests LLM capabilities (latency, structured output accuracy, cost), not frame rendering. Rectangles + text adequately test multi-step command execution. This lets the eval start ~8 hours earlier on the critical path.

---

## D010 — Canonical File Structure: components/board/renderers/

**Date:** 2026-02-18
**Category:** Architecture
**Context:** Two existing plans specified different locations for canvas rendering code: `apps/web/src/canvas/renderer.ts` (canvas-board-object-rendering plan) vs `components/board/renderers/` (implementation plan).
**Options:**

1. **`apps/web/src/canvas/`:** Flat structure, separates rendering from React components.
2. **`components/board/renderers/`:** Co-locates renderers with the BoardCanvas component. Feature-based organization matching Next.js conventions.
   **Choice:** Option 2 — `components/board/renderers/`.
   **Rationale:** Feature-based organization is recommended by the pre-search for frontend code ("Group BoardCanvas.tsx, BoardToolbar.tsx, useBoardSync.ts in board/"). Renderers are tightly coupled to BoardCanvas — co-location aids navigation. The canvas-board-object-rendering plan is superseded by the implementation plan. Pure function design principle from the canvas plan is preserved regardless of file location.

---

## D011 — Types in packages/shared from Phase 1 (not deferred to Phase 5)

**Date:** 2026-02-18
**Category:** Process
**Context:** The original plan deferred shared package setup to Phase 5. This would mean building against `apps/web/src/types/board.ts` for 4 phases, then moving everything.
**Options:**

1. **Defer to Phase 5:** Less upfront work. But: 4 phases of imports that need rewriting. Risk of divergent type definitions.
2. **Bootstrap in Phase 1:** Move types to `@collabboard/shared` immediately. All subsequent phases import from the canonical location.
   **Choice:** Option 2 — Bootstrap in Phase 1.
   **Rationale:** Both architecture.md and the pre-search specify shared packages as foundational monorepo infrastructure. Bootstrapping first eliminates churn from moving imports later. Phase 1 already has a dedicated teammate for package setup.

---

## D012 — Undo/Redo: Local-Only with Guard Clauses

**Date:** 2026-02-18
**Category:** Architecture
**Context:** Undo/redo in a real-time collaborative environment creates edge cases: User A creates an object, User B moves it, User A undoes — should it delete an object User B just interacted with? What if a remote user deletes an object in your undo stack?
**Options:**

1. **Collaborative undo (undo only your operations on objects, even if others touched them since):** Complex, requires tracking per-user operation history and operational transform. Overkill.
2. **Local-only undo with guard clauses:** Undo stack only contains local operations. Before executing undo, verify target object still exists. Store full snapshots (not deltas). Cap at ~50 entries. Clear on disconnect.
   **Choice:** Option 2 — Local-only with guard clauses.
   **Rationale:** This is how Figma and Excalidraw handle it. Full snapshots allow safe re-creation of deleted objects. Guard clauses (check existence, skip silently if stale) handle the concurrent-delete edge case without complex distributed undo logic.

---

## D013 — Broadcast Error Handling: Catch + Toast on Mutations

**Date:** 2026-02-18
**Category:** Architecture
**Context:** The current code fire-and-forgets all Supabase Realtime broadcasts (`void channelRef.current?.send(...)`). The plan adds more broadcast surface area (AI results, connectors, frames).
**Options:**

1. **Keep fire-and-forget everywhere:** Simple. But: silent data loss if broadcasts fail.
2. **Add `.catch()` + toast + reconciliation on object mutations:** Show "Change may not have synced" toast. Call `loadObjects()` to reconcile. Keep fire-and-forget for cursor updates (ephemeral, high-frequency).
   **Choice:** Option 2 — Catch + toast on mutations, fire-and-forget on cursors.
   **Rationale:** Cursor updates are ephemeral — a dropped cursor position corrects itself on the next update (50ms later). Object mutations are persistent — a dropped create/delete/move is actual data loss. The distinction aligns with the spec's resilience requirement: "Graceful disconnect/reconnect handling."

---

## D014 — Rate Limiting: Upstash Sliding Window

**Date:** 2026-02-18
**Category:** Architecture
**Context:** The AI command endpoint needs rate limiting to prevent abuse and control costs. The pre-search recommends Upstash Redis.
**Options:**

1. **In-memory rate limiting:** Simple Map-based counter. But: resets on serverless cold start, doesn't work across Vercel function instances.
2. **Upstash Redis sliding window:** Edge-compatible, persistent across instances, sub-millisecond latency. `@upstash/ratelimit` provides the abstraction.
   **Choice:** Option 2 — Upstash sliding window. Limits: 10 commands/minute per user, 30 commands/minute per board. Returns `429` with `Retry-After`. Numbers are tunable during testing.
   **Rationale:** Serverless functions are stateless — in-memory counters don't persist. Upstash is the standard solution for Vercel edge rate limiting. Per-user and per-board limits prevent both individual abuse and shared-board flooding. Costs feed directly into the AI Cost Analysis deliverable.

---

## D015 — Versioning Clarification: Per-Object (not Per-Property)

**Date:** 2026-02-18
**Category:** Architecture
**Context:** Documentation inconsistency discovered during plan review. `tech-stack.md` described per-property versioning (`{ propertyName, value, version, nonce }` per field), while D001 and the actual codebase implement per-object versioning (single `version` integer on each `BoardObject`). Needed to pick one and align all docs.
**Options:**

1. **Per-property versioning:** Each field has its own version counter. Allows two users to edit different properties of the same object without conflict (e.g., User A changes color while User B changes text). But: adds payload size (version per field), complex merge logic, and the codebase already implements per-object.
2. **Per-object versioning:** Single `version` integer per object. Any mutation increments it. Simpler payloads, simpler merge (`incoming.version >= existing.version`). The edge case it doesn't handle (two users editing different properties of the same object simultaneously) is near-zero probability for discrete whiteboard objects.
   **Choice:** Option 2 — Per-object versioning. This is what's already implemented.
   **Rationale:** Discrete whiteboard objects (sticky notes, shapes, frames) are not like spreadsheet cells or rich text — users rarely edit different properties of the same object simultaneously. The 0.01% edge case (User A drags while User B recolors) is low-stakes: last write wins, user redoes their action. Per-property adds complexity for negligible benefit. Matches Excalidraw's production approach. All docs updated: `tech-stack.md`, `architecture.md` invariant #8, `CLAUDE.md` invariant #5.

---

## D016 — Cloudflare Workers: Officially Removed (not just deferred)

**Date:** 2026-02-18
**Category:** Architecture
**Context:** D003 chose Supabase Realtime over Durable Objects but described DOs as "deferred to post-submission." Review confirmed `apps/realtime/` is a completely empty scaffold (no source code, no wrangler.toml, env vars set to `FILL_IN_LATER`). The architecture.md and .env.example still referenced Cloudflare infrastructure.
**Options:**

1. **Keep as deferred:** Leave scaffold and references for potential future use.
2. **Remove references:** Clean up docs and env to reflect reality. The scaffold can be recreated if needed.
   **Choice:** Option 2 — Remove references from docs and .env.example.
   **Rationale:** Stale references to unused infrastructure confuse agents and developers. The `apps/realtime/` directory can stay as an empty scaffold (removing it is a separate cleanup), but documentation should reflect what's actually in use. Cleaned up: `architecture.md` (stack table, monorepo diagram, invariants #6/#7), `tech-stack.md` (hosting row), `.env.example` (Cloudflare vars removed).

---

## D017 — AI Provider: GPT-4o-mini (via @ai-sdk/openai)

**Date:** 2026-02-19
**Category:** Technology
**Context:** Phase 4A provider evaluation. Needed to select an LLM for the AI agent feature (6+ command types, <2s latency, structured output, tool calling).
**Options:**

1. **GPT-4o-mini:** $0.15/$0.60 per 1M tokens, ~520ms avg, 128K context, mature tool calling. ~$30/month at 50K calls.
2. **Claude Haiku 4.5:** $1/$5 per 1M tokens, ~680ms avg, 200K context, superior agentic reliability. ~$225/month at 50K calls.
3. **Gemini 2.0 Flash:** $0.10/$0.40 per 1M tokens, ~450ms avg, 1M context, newest. ~$92/month at 50K calls. Less mature Vercel AI SDK integration.
   **Choice:** Option 1 — GPT-4o-mini.
   **Rationale:** Cheapest at scale (7.5x cheaper than Haiku), fastest mature option, best-tested with Vercel AI SDK. Template bypass for complex patterns (SWOT, Kanban) eliminates LLM entirely for those commands (~100ms). Vercel AI SDK makes provider swap trivial (~3 lines) if accuracy proves insufficient — switch to Haiku as fallback.

---

## D018 — Observability: LiteLLM Proxy + Self-Hosted LangFuse

**Date:** 2026-02-19
**Category:** Technology
**Context:** Need observability into both CollabBoard's AI commands (Phase 4C) and the developer's own Claude Code CLI usage.
**Options:**

1. **LangSmith cloud only:** Managed, easy setup. But: data leaves your infrastructure, limited to LLM traces only.
2. **LangFuse cloud only:** Managed, cost tracking built-in. Same data ownership concern.
3. **Self-hosted LangFuse + LiteLLM proxy + LangSmith cloud (optional):** Full data ownership, API proxy captures all calls transparently, hooks capture agent-level events. Docker Compose for easy management.
   **Choice:** Option 3 — Self-hosted LangFuse + LiteLLM proxy.
   **Rationale:** LiteLLM proxy intercepts all API calls without code changes to Claude Code (just set ANTHROPIC_BASE_URL). Self-hosted LangFuse provides full data ownership. LangSmith as optional cloud complement for prompt iteration. Graceful fallback — if proxy is down, everything still works. Bonus: Claude Code has native OTel support that feeds directly into the collector.

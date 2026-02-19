# CollabBoard — Gotchas

## G001: Dual Supabase Client Pattern

**Category:** Architecture
**Issue:** Need Clerk JWT for REST CRUD but anon key for Realtime broadcast/presence.
**Fix:** Two Supabase client instances — one authenticated (Clerk JWT), one anonymous (anon key for broadcast).

## G002: Canvas Must Be Client-Only

**Category:** Rendering
**Issue:** Canvas 2D API is browser-only. SSR will crash if canvas code runs server-side.
**Fix:** Guard with `'use client'` directive or `typeof window !== 'undefined'` check.

## G003: Supabase Realtime 64KB Limit

**Category:** Real-time
**Issue:** Broadcast payloads must stay under 64KB or they silently fail.
**Fix:** Keep payloads small (single object updates). Chunk or refuse large payloads.

## G004: Connector Renderer Needs Object Resolver

**Category:** Rendering
**Issue:** ConnectorRenderer needs to look up source/target objects by ID to resolve port positions, but ShapeRenderer interface doesn't accept a Map parameter.
**Fix:** Module-level `setObjectResolver(fn)` function. Must be called before each render pass in BoardCanvas: `setObjectResolver((id) => objectsMap.get(id) ?? null)`.

## G005: Agent Teams — Compaction Risk After Many Tasks

**Category:** Process
**Issue:** Claude Code teammate agents hit context limits and compact after 5-6 tasks, losing nuance and becoming unreliable.
**Fix:** Shut down and replace agents after 2-3 tasks. Monitor context usage proactively. Send shutdown requests early — by the time compaction starts it's too late.

## G006: Agent Teams — Idle Agents Don't Pick Up Messages

**Category:** Process
**Issue:** Teammate agents frequently go idle without processing queued messages. Requires multiple nudges to start new tasks.
**Fix:** Send a direct follow-up nudge after the initial task assignment. Keep messages short and imperative ("Task #X is waiting. TaskGet, claim, start now.").

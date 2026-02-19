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

# CollabBoard — AI Context

**Project:** Real-time collaborative whiteboard. Canvas 2D rendering, real-time sync via Supabase Realtime Broadcast, persistent state in Supabase Postgres, auth via Clerk, AI commands via Vercel AI SDK.

**Stack:** Next.js 14 (App Router) · Clerk · Supabase (Postgres + Realtime) · Tailwind 3 · Canvas 2D API

<!-- Inherited from gauntlet/CLAUDE.md: TDD mandate, git workflow, security basics, context hygiene, platform rules. -->

## Directory Map

```
apps/web/          Next.js app (App Router)
apps/realtime/     (Not in use — sync via Supabase Realtime; see D003, D016)
packages/db/       Supabase client factory + generated types
packages/shared/   Zod schemas, shared types
packages/ui/       Shared React components
docs/              Architecture, specs, plans
.claude/agents/    Subagent prompts
.claude/commands/  Slash command templates
```

## Commands

```bash
pnpm dev           # Start all apps (turbo)
pnpm build         # Build all apps
pnpm typecheck     # TypeScript check (turbo)
pnpm lint          # ESLint (turbo)
pnpm lint:fix      # ESLint autofix
pnpm test          # Vitest (turbo)
pnpm test:watch    # Vitest watch mode
pnpm test:e2e      # Playwright
pnpm test:coverage # Coverage report
pnpm test:load     # k6 WebSocket load test
```

## Code Style

- **No `as` casts** — fix the type, don't suppress it
- **`import type`** for all type-only imports
- **Zod validation** on all API route inputs, all broadcast message handlers, all external data
- **File naming:** kebab-case for files, PascalCase for React components
- **Import order:** Node builtins → external packages → internal packages → relative
- **Tailwind preferred** for styling; no inline `style=` except for dynamic canvas values

## Architecture Invariants

1. Canvas renders on client only — guard with `'use client'` or `typeof window !== 'undefined'`
2. Supabase Realtime Broadcast = sync layer; Supabase Postgres = persistence authority
3. RLS on all Supabase tables; service role key is server-only
4. `NEXT_PUBLIC_` prefix = truly public — never a secret or service key
5. LWW + per-object version number for conflicts (not per-property — see D001, tech-stack.md)
6. AI commands use structured outputs only — Vercel AI SDK tool calling
7. All server-side API routes verify Clerk auth before mutations
8. Optimistic updates on canvas — never block renders on network
9. Type-specific object data in JSONB `properties` column, validated by Zod discriminated unions
10. No tRPC — direct Supabase for hot path, Next.js API routes for AI + sharing (see D004)

## Stack-Specific Security

- Verify webhook signatures (Clerk, Stripe) before processing
- Auth routes: Clerk `auth()` check on all API routes that modify data

## MCP Rotation

Active 2-3 servers max. Rotate by task:

- Coding: github + context7
- DB: github + supabase
- Research: context7 only

## Git Worktrees

- One Claude Code session per worktree — never share a session
- Never let two sessions edit the same file simultaneously
- Each worktree gets its own `.env.local` (copy from root)
- Worktrees directory: `.trees/` (gitignored)

## Maintenance

Update this file at sprint end and after any architectural decision. Stale context costs more than no context.

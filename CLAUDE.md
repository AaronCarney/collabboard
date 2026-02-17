# CollabBoard — AI Context

**Project:** Real-time collaborative whiteboard. Canvas 2D rendering, WebSocket sync via Cloudflare Durable Objects, persistent state in Supabase, auth via Clerk, AI commands via OpenAI structured outputs.

**Stack:** Next.js 14.2.18 · tRPC 11 · Clerk 6 · Supabase · Cloudflare Workers + Durable Objects · Prisma 5 · Tailwind 3 · Canvas 2D API · OpenAI 4

## Directory Map

```
apps/web/          Next.js app (App Router)
apps/realtime/     Cloudflare Worker + Durable Objects
packages/db/       Prisma schema + generated client
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

- **No `any` type** — use `unknown` + type guards, or proper generics
- **No `as` casts** — fix the type, don't suppress it
- **`import type`** for all type-only imports
- **Zod validation** on all tRPC inputs, all WebSocket message handlers, all external data
- **File naming:** kebab-case for files, PascalCase for React components
- **Import order:** Node builtins → external packages → internal packages → relative
- **Tailwind preferred** for styling; no inline `style=` except for dynamic canvas values

## Architecture Invariants

1. Canvas renders on client only — guard with `'use client'` or `typeof window !== 'undefined'`
2. Durable Objects = live authority; Supabase = persistence
3. RLS on all Supabase tables; service role key is server-only
4. `NEXT_PUBLIC_` prefix = truly public — never a secret or service key
5. 64KB max WebSocket payload — validate and enforce in DO
6. 300 max WebSocket connections per board — enforce in DO
7. LWW + version number for all object property conflicts
8. AI commands use structured outputs only — `response_format: { type: "json_schema" }`
9. All tRPC mutations use `protectedProcedure`
10. Optimistic updates on canvas — never block renders on network

## TDD Mandate

Write failing tests FIRST. Run tests after every change. Merge only green.

Sequence for every feature: `/research` → `/plan` → @test-writer (failing tests) → implement → @code-reviewer → fix BLOCKING issues → `pnpm typecheck && pnpm lint && pnpm test && pnpm build`

## Security

- Never hardcode secrets — use environment variables
- Validate all inputs with Zod
- Verify webhook signatures (Clerk, Stripe) before processing
- Auth on all routes: `protectedProcedure` for mutations, `publicProcedure` for public reads

## MCP Rotation

Active 2-3 servers max. Rotate by task:

- Coding: github + context7
- DB: github + supabase
- CF/DO: github + cloudflare
- Research: context7 only

Run `/cost` every 30 min — if >50k tokens, /compact or /clear.

To temporarily disable a server: comment it out in `.mcp.json` and restart Claude Code.

## Git Worktrees

- One Claude Code session per worktree — never share a session
- Never let two sessions edit the same file simultaneously
- Each worktree gets its own `.env.local` (copy from root)
- Reconcile architectural conflicts in a planning session before resuming
- Worktrees directory: `.trees/` (gitignored)

## Maintenance

Update this file at sprint end and after any architectural decision. Stale context costs more than no context.

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

## ESLint Rules (enforced by pre-commit, zero warnings allowed)

These rules cause the most agent-generated lint failures. Follow them in ALL code:

- **Explicit return types on exported functions** — every exported function needs a return type annotation (`: React.JSX.Element`, `: Promise<NextResponse>`, etc.)
- **No `!` non-null assertions** — use type guards (`if (!val) return;`) or `?? fallback` instead
- **No `any`** — type Supabase results explicitly, use `unknown` + narrowing for dynamic data
- **Vitest imports** — always `import { describe, it, expect, vi } from 'vitest'` explicitly in test files (don't rely on globals)
- **No void arrow returns** — wrap void calls in braces: `onClick={() => { doThing(); }}` not `onClick={() => doThing()`
- **Clerk server imports** — use `@clerk/nextjs/server` for server-side `auth()`, not `@clerk/nextjs`

Run `pnpm lint` before considering any file done. The pre-commit hook runs `eslint --fix --max-warnings=0` on ALL `*.{ts,tsx}` files project-wide.

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

## CI/CD

- CI runs **typecheck, lint, test, build** in parallel on push/PR to `main`
- All changes to `main` go through PRs with required CI checks
- Verification gate: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` — all must pass
- AI SDK packages are pinned to exact versions (no carets) due to frequent breaking changes in minors

## Maintenance

Update this file at sprint end and after any architectural decision. Stale context costs more than no context.

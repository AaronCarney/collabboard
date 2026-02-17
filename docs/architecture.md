# Architecture — CollabBoard

## Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Frontend | Next.js | 14.2.18 | React SSR + App Router |
| API | tRPC | 11.x | Type-safe client-server RPC |
| Auth | Clerk | 6.x | Authentication + user management |
| Real-time | Cloudflare Durable Objects | — | Live state authority |
| Database | Supabase (Postgres) | — | Persistent storage |
| ORM | Prisma | 5.x | Type-safe DB access |
| Styling | Tailwind CSS | 3.x | Utility-first CSS |
| Canvas | Canvas 2D API | — | Object rendering (native browser) |
| AI | OpenAI | 4.x | Structured output commands |
| Rate limiting | Upstash Redis | — | Edge rate limiting |
| Hosting | Vercel (Next.js) + Cloudflare Workers | — | Compute |

## Monorepo Structure

```
collabboard/
├── apps/
│   ├── web/                  # Next.js 14 application
│   │   ├── app/              # App Router pages + layouts
│   │   ├── components/       # React components
│   │   ├── lib/              # Client utilities, tRPC client
│   │   └── server/           # tRPC router, server utilities
│   └── realtime/             # Cloudflare Workers + Durable Objects
│       ├── src/
│       │   ├── index.ts      # Worker entry point
│       │   └── board-do.ts   # Durable Object class
│       └── wrangler.toml
├── packages/
│   ├── ui/                   # Shared React components
│   ├── db/                   # Prisma schema + client
│   └── shared/               # Shared types, Zod schemas, utilities
├── docs/
│   ├── architecture.md       # This file
│   ├── data-model.md         # Database schema documentation
│   ├── specs/                # Feature specs (acceptance criteria)
│   ├── plans/                # Implementation plans
│   └── research/             # Pre-search outputs
├── load-tests/               # k6 load test scripts
├── .claude/
│   ├── agents/               # Subagent system prompts
│   └── commands/             # Slash command templates
├── .github/
│   └── workflows/ci.yml
├── CLAUDE.md                 # AI context file (root)
├── product.md                # Conductor product context
├── tech-stack.md             # Conductor stack decisions
└── workflow.md               # Conductor workflow config
```

## Performance Budgets

| Metric | Budget | Measurement |
|--------|--------|-------------|
| Cursor sync latency | p95 < 50ms | k6 WebSocket round-trip |
| Object sync latency | p95 < 100ms | k6 WebSocket round-trip |
| Canvas render FPS | > 60fps steady | Chrome DevTools |
| WebSocket connect | p95 < 500ms | k6 `ws_connecting` |
| Page load (LCP) | < 3s on 4G | Lighthouse |
| API response | p95 < 200ms | Vercel Analytics |
| Concurrent users/room | 300 max | Load test |
| WebSocket payload | < 64KB per message | Code assertion |

## Architecture Invariants

1. **Canvas is client-side only.** Never render canvas elements on the server. Guard with `typeof window !== 'undefined'` or `'use client'`.
2. **Durable Objects are the live state authority.** All real-time object mutations route through the DO. Supabase receives the persisted copy after DO confirms.
3. **Supabase is the persistence layer.** The DO holds in-memory state for active boards. Supabase stores the canonical record. On DO eviction, state is rehydrated from Supabase.
4. **Row Level Security is enabled on all tables.** No table may be queried without RLS policies. Service role key is server-only and never exposed to clients.
5. **`NEXT_PUBLIC_` prefix = public.** No secret, token, or service role key may have this prefix. Audit all environment variables before committing `.env.example`.
6. **64KB WebSocket message limit.** All DO WebSocket payloads must be validated at runtime. Payloads exceeding 64KB must be chunked or refused.
7. **300 connections per room.** The DO must enforce a hard limit of 300 concurrent WebSocket connections per board. Reject connections beyond this limit with a 503.
8. **LWW + version number for conflicts.** Object mutations use Last-Write-Wins with a monotonically increasing version number per property. Tie-breaking uses a random nonce assigned at mutation time.
9. **AI commands produce structured outputs only.** All OpenAI calls use `response_format: { type: "json_schema" }`. Never parse free-text AI responses as commands.
10. **Optimistic updates on Canvas.** Canvas renders immediately on user action; the confirmed server state is applied when received. Never block renders on network roundtrips.

## Security

- All tRPC procedures that modify data use `protectedProcedure` (Clerk auth middleware)
- Webhook payloads (Clerk, Stripe) are verified with HMAC signature before processing
- Supabase service role key is never passed to client components or `NEXT_PUBLIC_` vars
- All user inputs are validated with Zod schemas before reaching database
- RLS policies reference `auth.uid()` for row-level isolation

# Architecture — CollabBoard

## Stack

| Layer         | Technology                           | Version | Purpose                                                     |
| ------------- | ------------------------------------ | ------- | ----------------------------------------------------------- |
| Frontend      | Next.js                              | 14.2.18 | React SSR + App Router                                      |
| API           | Direct Supabase + Next.js API routes | —       | Hot-path stays fast; API routes for AI + sharing            |
| Auth          | Clerk                                | 6.x     | Authentication + user management                            |
| Real-time     | Supabase Realtime Broadcast          | —       | Optimistic updates + broadcast for sync                     |
| Database      | Supabase (Postgres)                  | —       | Persistent storage                                          |
| DB types      | supabase gen types                   | —       | Generated TypeScript types from schema                      |
| Styling       | Tailwind CSS                         | 3.x     | Utility-first CSS                                           |
| Canvas        | Canvas 2D API                        | —       | Object rendering (native browser)                           |
| AI            | TBD — pending provider evaluation    | —       | Structured output commands via Vercel AI SDK (see Phase 4A) |
| Rate limiting | Upstash Redis                        | —       | Edge rate limiting                                          |
| Hosting       | Vercel (Next.js)                     | —       | Compute (SSR + API routes + edge functions)                 |

## Monorepo Structure

```
collabboard/
├── apps/
│   ├── web/                  # Next.js 14 application
│   │   ├── app/              # App Router pages + layouts
│   │   ├── components/       # React components
│   │   ├── lib/              # Client utilities, board store, services
│   │   └── server/           # Server utilities
│   └── realtime/             # (Deferred — not in use; sync via Supabase Realtime)
├── packages/
│   ├── ui/                   # Shared React components
│   ├── db/                   # Supabase client factory + generated types
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
├── docs/product.md           # Conductor product context
├── docs/tech-stack.md        # Conductor stack decisions
└── docs/workflow.md          # Conductor workflow config
```

## Performance Budgets

| Metric                | Budget                                                  | Measurement                   |
| --------------------- | ------------------------------------------------------- | ----------------------------- |
| Cursor sync latency   | p95 < 50ms                                              | k6 WebSocket round-trip       |
| Object sync latency   | p95 < 100ms                                             | k6 WebSocket round-trip       |
| Canvas render FPS     | > 60fps steady                                          | Chrome DevTools               |
| WebSocket connect     | p95 < 500ms                                             | k6 `ws_connecting`            |
| Page load (LCP)       | < 3s on 4G                                              | Lighthouse                    |
| API response          | p95 < 200ms                                             | Vercel Analytics              |
| Concurrent users/room | 5+ without degradation (spec target); stress test at 10 | Playwright multi-context + k6 |
| WebSocket payload     | < 64KB per message                                      | Code assertion                |

## Architecture Invariants

1. **Canvas is client-side only.** Never render canvas elements on the server. Guard with `typeof window !== 'undefined'` or `'use client'`.
2. **Supabase Realtime Broadcast is the sync layer.** Client-side optimistic updates + Supabase Realtime broadcast for cross-user sync. Supabase Postgres is the persistence authority. No separate real-time server.
3. **Supabase is the persistence layer.** Board state lives in Postgres with RLS. Objects are loaded on connect and kept in-memory client-side. Mutations are optimistically applied, broadcast to peers, and persisted to Postgres.
4. **Row Level Security is enabled on all tables.** No table may be queried without RLS policies. Service role key is server-only and never exposed to clients.
5. **`NEXT_PUBLIC_` prefix = public.** No secret, token, or service role key may have this prefix. Audit all environment variables before committing `.env.example`.
6. **64KB message limit.** All Supabase Realtime broadcast payloads must stay under 64KB. Payloads exceeding this limit must be chunked or refused.
7. **Concurrent user target: 5+ without degradation.** Spec requires 5+ concurrent users per board. Stress test at 10. Supabase Realtime handles this scale.
8. **LWW + per-object version number for conflicts.** Each object has a single monotonically increasing `version` integer. All mutations send full object state. Incoming updates accepted if `incoming.version >= existing.version`. This is per-object, not per-property — discrete whiteboard objects are rarely edited on different properties simultaneously (D001).
9. **AI commands produce structured outputs only.** All LLM calls use structured output / tool calling via Vercel AI SDK. Never parse free-text AI responses as commands.
10. **Optimistic updates on Canvas.** Canvas renders immediately on user action; the confirmed server state is applied when received. Never block renders on network roundtrips.
11. **Type-specific object data lives in JSONB `properties` column.** Common fields (id, x, y, width, height, etc.) are top-level columns. Per-type data (x2, from_object_id, etc.) goes in `properties`. Validated by Zod discriminated unions.

## Security

- All server-side API routes verify Clerk auth before processing mutations
- Webhook payloads (Clerk, Stripe) are verified with HMAC signature before processing
- Supabase service role key is never passed to client components or `NEXT_PUBLIC_` vars
- All user inputs are validated with Zod schemas before reaching database
- RLS policies reference `auth.uid()` for row-level isolation

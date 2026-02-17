# Tech Stack — CollabBoard

## Stack Decisions

| Layer              | Technology                   | Version          | Rationale                                                                   |
| ------------------ | ---------------------------- | ---------------- | --------------------------------------------------------------------------- |
| Frontend framework | Next.js                      | 14.2.18 (pinned) | App Router + RSC + Vercel zero-config deploy                                |
| API layer          | tRPC                         | 11.x             | End-to-end type safety; no OpenAPI codegen needed                           |
| Authentication     | Clerk                        | 6.x              | Best LLM-agent DX; typed SDK; webhooks for user sync                        |
| Real-time          | Cloudflare Durable Objects   | —                | Global edge presence; stateful WebSocket; strong consistency per object     |
| Database           | Supabase (Postgres)          | —                | RLS, real-time, storage — all first-party; free tier sufficient for MVP     |
| ORM                | Prisma                       | 5.x              | Type-safe queries; Zod schema generation; migration tooling                 |
| Styling            | Tailwind CSS                 | 3.x              | AI-agent friendly (utility classes, no CSS-in-JS runtime)                   |
| Canvas rendering   | Canvas 2D API                | Browser native   | 60 FPS target; no library overhead; deterministic rendering                 |
| AI features        | OpenAI                       | 4.x              | Structured outputs (`response_format: json_schema`); no free-text parsing   |
| Rate limiting      | Upstash Redis                | —                | Edge-compatible; REST API; per-connection rate limiting for WS              |
| Package manager    | pnpm                         | 9.x              | Workspace support; strict mode; fast installs                               |
| Build system       | Turborepo                    | 2.x              | Monorepo task orchestration; caching                                        |
| Language           | TypeScript                   | 5.7.x            | Strict mode + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`     |
| Linting            | ESLint 9 + typescript-eslint | Latest           | Flat config; `no-any: error`; `consistent-type-imports: error`              |
| Formatting         | Prettier                     | 3.x              | LF line endings; 100 char width                                             |
| Testing            | Vitest                       | 2.1.8 (pinned)   | Fast; Vite-native; happy-dom env; no Jest migration needed                  |
| E2E testing        | Playwright                   | 1.49.1 (pinned)  | Multi-browser; WebSocket interception; Chromium/Firefox/Safari/Mobile       |
| Load testing       | k6                           | System install   | WebSocket scenarios; custom metrics; threshold assertions                   |
| CI/CD              | GitHub Actions               | —                | Native GitHub integration; `anthropics/claude-code-action@v1` for AI review |
| Hosting (frontend) | Vercel                       | —                | Zero-config Next.js; edge functions; instant rollback                       |
| Hosting (realtime) | Cloudflare Workers           | —                | DO co-located with Worker; global edge                                      |

## Version Pinning Policy

**Always pin exact versions for these:**

- `next`: `14.2.18` (not `^14` — major Next.js versions change routing behavior)
- `@trpc/server` / `@trpc/client`: pin minor version (tRPC has breaking API changes between minors)
- `@clerk/nextjs`: pin minor version (Clerk auth middleware changes can break auth entirely)
- `prisma` / `@prisma/client`: always same version (schema/client must match)
- `vitest` / `@vitest/*`: pin together (mismatched versions cause hard-to-debug test failures)
- `playwright` / `@playwright/test`: always same version

**Allow `^` (semver patch/minor) for:**

- Tailwind CSS
- ESLint plugins
- Prettier
- Development utilities

## "Not Using" — Rejection Log

| Technology            | Rejected Because                                                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Yjs / CRDT            | Adds significant complexity; LWW + version sufficient for MVP object conflict resolution. CRDT needed only for rich text (using Yjs + TipTap for that specific case only) |
| WebGL / PixiJS        | Overkill for MVP shapes; Canvas 2D achieves 60 FPS for the object count expected; GPU overhead vs. simplicity tradeoff favors Canvas 2D                                   |
| Cypress               | Playwright has better multi-browser support, WebSocket interception, and context isolation for multi-user tests; Cypress WebSocket support is limited                     |
| Jest                  | Vitest is faster, native ESM, and has identical API; no reason to use Jest in a Vite-based project                                                                        |
| NextAuth.js           | Clerk provides better DX, webhooks, pre-built UI components, and first-party tRPC middleware; NextAuth requires more manual wiring                                        |
| MySQL                 | Supabase (Postgres) provides RLS, real-time subscriptions, and vector search; MySQL has none of these natively                                                            |
| PWA / Service Workers | Real-time WebSocket requires network; offline-first adds complexity without benefit for a live collaboration tool                                                         |
| Firebase              | Vendor lock-in on proprietary query model; Supabase (open-source Postgres) is preferable and self-hostable                                                                |
| Server-Sent Events    | WebSocket bidirectional capability needed for cursor sync and object mutations; SSE is one-way only                                                                       |

## Conflict Resolution Strategy

All object property mutations use **Last-Write-Wins (LWW) with per-property version numbers:**

1. Every object property has a `version` counter (starts at 1, increments on mutation)
2. Every mutation message includes: `{ propertyName, value, version, nonce }`
3. A mutation is applied only if `incoming.version > stored.version`
4. Tie-breaking (equal version): compare `nonce` values (random UUIDs, alphabetical order wins)
5. The Durable Object is the single authority for resolving conflicts — all clients apply its resolved state

**Exception — Rich text:** Sticky note text content uses Yjs CRDT via TipTap editor. This is the only place CRDT is used. The Y.Doc is serialized to Uint8Array and stored in Supabase; the DO rehydrates it on startup.

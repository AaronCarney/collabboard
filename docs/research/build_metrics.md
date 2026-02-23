# Build Metrics

## Technical Stack

| Layer                | Technology                                                            | Details                                                                                                                                                               |
| -------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**         | Next.js 14.2.29 (App Router), React 18.3.1, TypeScript 5.7.2 (strict) | Raw HTML5 Canvas API — no Konva/Fabric/PixiJS. Custom `requestAnimationFrame` render loop with dirty-flag optimization.                                               |
| **Canvas/Layout**    | HTML5 Canvas 2D + @dagrejs/dagre 2.0.4                                | Hit testing, spatial index, resize handles, renderer registry — all custom. Dagre for auto-layout (DAG, grid, stack, radial).                                         |
| **State**            | React built-ins only (useState, useRef, useCallback)                  | No Zustand/Redux/Jotai. Board state as `Map<string, BoardObject>`. Custom undo/redo command history.                                                                  |
| **Auth**             | Clerk (@clerk/nextjs 6)                                               | Middleware-protected routes. Clerk JWT tokens passed to Supabase via custom `createClerkSupabaseClient()`.                                                            |
| **Backend/DB**       | Supabase (@supabase/supabase-js 2)                                    | Authenticated REST client (Clerk JWT + RLS) for CRUD. Anon client for Realtime (Supabase Realtime cannot authenticate Clerk RS256 JWTs).                              |
| **Realtime**         | Supabase Realtime (broadcast + presence)                              | Channel per board (`board:<boardId>`). Events: object mutations, cursor positions, presence. Optimistic local update → broadcast → persist.                           |
| **AI Integration**   | Vercel AI SDK 6.0.91 + @ai-sdk/openai 3.0.30                          | Model: **GPT-4o-mini** via `generateText` with `Output.object()` (structured output). Zod-validated plan schema. Anthropic and Google SDKs available but not default. |
| **AI Observability** | LangSmith + LangFuse (optional, dynamic imports)                      | Traces: userId, boardId, command, commandType, tokensUsed, latencyMs, success/error. Prompt redaction for board state.                                                |
| **Styling**          | Tailwind CSS 3 + clsx 2.1.1 + lucide-react 0.574.0                    | Typography plugin. Sonner for toasts.                                                                                                                                 |
| **Validation**       | Zod 3.23.0 (packages/shared)                                          | Board object schemas, AI plan schema, API request validation.                                                                                                         |
| **Monorepo**         | Turborepo 2.3.3 + pnpm 9.15.0 workspaces                              | `apps/web` (Next.js), `packages/shared` (Zod schemas), `packages/db` (Supabase client).                                                                               |
| **Testing**          | vitest 2.1.8, Playwright 1.49.1, Testing Library 16.1.0               | happy-dom default env. Coverage: lines/functions 40%, branches 35%. k6 for load tests.                                                                                |
| **Linting**          | ESLint 9 (flat config) + @typescript-eslint 8.18.0 + Prettier 3.4.2   | husky + lint-staged pre-commit on all ts/tsx files.                                                                                                                   |
| **Deployment**       | Vercel                                                                | `vercel.json` with monorepo-aware install command.                                                                                                                    |

## Shared AI State

| Requirement                                                          | Implementation                                                                                                                                                        | Test Coverage                                                                                                                                                                                    |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| All users see AI-generated results in real-time                      | AI command route persists objects to Supabase, then broadcasts mutations on the board channel. All connected clients receive broadcast events and update local state. | **E2E:** `e2e/ai-commands.spec.ts:37` — two browser contexts, User A issues AI command, both canvases verified visible. **E2E:** `e2e/collaboration.spec.ts:5` — two-user real-time object sync. |
| Multiple users can issue AI commands simultaneously without conflict | `ai-queue.ts` (`enqueueForUser`) serializes commands per-user (prevents self-conflict) while allowing different users to execute in parallel.                         | **Unit:** `ai-queue.test.ts` — 8 tests covering same-user serialization, different-user parallelism (6 concurrent users), error recovery, queue cleanup, sync-throw handling.                    |

## AI Agent Performance

| Metric           | Target                         | Status                           | Evidence                                                                                                                                                                                                                                                                                                                                       |
| ---------------- | ------------------------------ | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Response latency | <2s for single-step commands   | **Measured, not asserted**       | `latencyMs` tracked in `CommandResult` and sent to LangSmith/LangFuse. No hard <2s assertion in tests — appropriate since latency depends on OpenAI API response time, which varies and would cause flaky CI. Template commands (SWOT, kanban, etc.) execute in <10ms with zero API calls. Monitor via observability dashboards in production. |
| Command breadth  | 6+ command types               | **Met — 10 tools + 5 templates** | 10 tool functions: createStickyNote, createShape, createFrame, createConnector, moveObject, resizeObject, updateText, changeColor, getBoardState, deleteObject. 5 templates: swot, kanban, retrospective, brainstorm, user_journey. Tested across command-router, plan-executor, and template test suites.                                     |
| Complexity       | Multi-step operation execution | **Met**                          | Plan-executor processes sequential steps from Zod-validated `PlanSchema`. Each plan contains ordered arrays of create/modify/delete actions. Templates generate multi-object plans (e.g., SWOT = frame + 4 sticky notes + 4 connectors). Tested in `plan-executor.test.ts`.                                                                    |
| Reliability      | Consistent, accurate execution | **Met**                          | Error handler with categorized fallback messages (`error-handler.ts`). AI queue recovers from rejected promises and sync throws without blocking subsequent commands. Collision detection resolves overlapping objects. Structured output via Zod validation rejects malformed LLM responses.                                                  |

## Development & Testing Costs

> **These values must be filled in from your billing dashboards — they cannot be generated programmatically.**

| Line Item                             | Source                                                         | Value     |
| ------------------------------------- | -------------------------------------------------------------- | --------- |
| OpenAI API cost (GPT-4o-mini)         | [platform.openai.com/usage](https://platform.openai.com/usage) | _fill in_ |
| OpenAI input tokens                   | OpenAI usage dashboard                                         | _fill in_ |
| OpenAI output tokens                  | OpenAI usage dashboard                                         | _fill in_ |
| OpenAI API call count                 | OpenAI usage dashboard or LangSmith trace count                | _fill in_ |
| Anthropic / Claude Code (dev tooling) | Anthropic billing dashboard                                    | _fill in_ |
| Supabase (DB + Realtime)              | Supabase project billing                                       | _fill in_ |
| Vercel (hosting/deployment)           | Vercel dashboard                                               | _fill in_ |
| LangSmith / LangFuse (observability)  | Respective dashboards                                          | _fill in_ |
| Embeddings                            | N/A — not used (tool-calling architecture, no RAG)             | $0        |

## Test Summary

| Category         | Files                                                                                                                                                                       | Approx. Tests        |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| AI unit tests    | ai-queue, command-router, plan-executor, templates, collision, error-handler, session-memory, context-pruning, system-prompt, layout-engine, instrument, tools, plan-schema | ~200+                |
| Board unit tests | board-store, board-logic, board-commands, spatial-index, canvas-drawing-utils                                                                                               | ~100+                |
| Component tests  | BoardCanvas, toolbar, presence, AI command bar                                                                                                                              | ~50+                 |
| E2E tests        | ai-commands, collaboration, concurrent, performance, persistence, resilience, smoke                                                                                         | 7 spec files         |
| Load tests       | k6 WebSocket sync                                                                                                                                                           | 1 script             |
| **Total**        | **68 test files**                                                                                                                                                           | **~1083 test cases** |

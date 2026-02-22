# Phase 1 Progress — Session Checkpoint

## Committed

- **B1-B3 bug fixes** — `65f846b` on main. Deletion persistence, concurrency queue, tool naming. 893 tests.

## In Progress (uncommitted, needs fixes before commit)

- **Phase 1.1 Plan-Then-Execute** — New files created but lint/test issues remain:
  - `plan-schema.ts` — DONE, tests pass
  - `plan-validator.ts` — DONE, tests pass
  - `plan-executor.ts` — DONE, has 2 lint warnings (check `as` usage)
  - `command-router.ts` — MODIFIED for structured output (generateText + Output.object), tests pass (12/12)
  - `system-prompt.ts` — MODIFIED
  - `error-handler.ts` — MODIFIED (AC24 NoObjectGeneratedError)
  - `command-router.test.ts` — REWRITTEN for structured output flow

- **Phase 1.2 Layout Engine** — New files created:
  - `layout-engine.ts` — 53 tests pass
  - `layout-engine.test.ts` — comprehensive tests
  - `validation.ts` — exported MIN_POSITION/MAX_POSITION
  - `@dagrejs/dagre` installed in package.json

## Remaining Issues Before Commit

1. **Lint failures** — check `pnpm lint` for errors in plan-executor.ts, command-router.ts
2. **Test failures** — 8 failing tests across 5 files. Need to identify which are our regressions vs pre-existing:
   - Run `pnpm test -- --run` and check failing files
   - Some may be from the other team's workspace UX changes (don't fix those)
3. **Unauthorized file changes** — the implementer agents modified files outside scope multiple times. Always verify `git diff --stat` before committing and revert non-AI files.

## Phase 1.3 Upstash Concurrency — DEFERRED

- Infra not ready (env vars are placeholders)
- In-memory queue (B2 fix) sufficient for now
- Bundle with Phase 3.2 when Redis is needed
- Research doc: `docs/research/phase-1.3-feasibility.md`

## Key Files Changed (Phase 1 scope only)

### Source

- `apps/web/src/lib/ai/plan-schema.ts` (NEW)
- `apps/web/src/lib/ai/plan-validator.ts` (NEW)
- `apps/web/src/lib/ai/plan-executor.ts` (NEW)
- `apps/web/src/lib/ai/layout-engine.ts` (NEW)
- `apps/web/src/lib/ai/command-router.ts` (MODIFIED)
- `apps/web/src/lib/ai/system-prompt.ts` (MODIFIED)
- `apps/web/src/lib/ai/error-handler.ts` (MODIFIED)
- `apps/web/src/lib/ai/validation.ts` (MODIFIED — exported constants)
- `apps/web/package.json` (added @dagrejs/dagre)

### Tests

- `apps/web/src/lib/ai/__tests__/plan-schema.test.ts` (NEW)
- `apps/web/src/lib/ai/__tests__/plan-validator.test.ts` (NEW)
- `apps/web/src/lib/ai/__tests__/plan-executor.test.ts` (NEW)
- `apps/web/src/lib/ai/__tests__/layout-engine.test.ts` (NEW)
- `apps/web/src/lib/ai/__tests__/command-router.test.ts` (REWRITTEN)
- `apps/web/src/lib/ai/__tests__/error-handler.test.ts` (MODIFIED)

### Docs

- `docs/specs/phase-1.1-plan-then-execute.md`
- `docs/specs/phase-1.2-layout-engine.md`
- `docs/research/phase-1.1-constraints.md`
- `docs/research/phase-1.2-constraints.md`
- `docs/research/phase-1.3-feasibility.md`
- `docs/reviews/phase-1.1-plan-then-execute.md`
- `docs/reviews/phase-1.2-layout-engine.md`

## Next Session Steps

1. Fix remaining lint errors (plan-executor.ts, command-router.ts)
2. Fix remaining test failures (identify which are ours vs other team's)
3. Commit Phase 1.1 + 1.2 separately (two commits)
4. Run full verification gate
5. Push to origin
6. Continue to Phase 2 (model routing, streaming, context management)

## Gotchas Learned

- Implementer agents frequently modify files outside their scope — always verify `git diff --stat` before committing
- Another team is working on workspace UX files (components/board/, board-logic, transforms, spatial-index) — never touch those
- Agent templates have been updated — ensure newly spawned agents use new templates
- `executePlan` is synchronous — mock with `mockReturnValue` not `mockResolvedValue`
- Use `generateText` + `Output.object()` not deprecated `generateObject`
- Pre-existing flaky test: `board-limit.test.tsx` occasionally times out on waitFor

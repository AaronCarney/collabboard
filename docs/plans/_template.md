# Plan: [Feature Name]

**Source spec:** docs/specs/[feature-slug].md
**Created:** YYYY-MM-DD

## New Dependencies

| Package | Version | Purpose                                     |
| ------- | ------- | ------------------------------------------- |
| None    | —       | [or list new packages with pinned versions] |

## Database Changes

[Describe any Prisma schema changes, or "None — no schema changes in this feature"]

## Implementation Phases

### Phase 1: Schema & Types

**Commit:** `feat(shared): [description]`

- [ ] [Define Zod schemas / TypeScript types]
- [ ] [Write unit tests: parse valid objects, reject invalid]
- [ ] `pnpm typecheck` passes

### Phase 2: Backend

**Commit:** `feat(api): [description]`

- [ ] [tRPC procedures / Durable Object handlers]
- [ ] [Unit tests for business logic]
- [ ] `pnpm test` passes

### Phase 3: Frontend

**Commit:** `feat(web): [description]`

- [ ] [React components / canvas / UI]
- [ ] `pnpm typecheck` passes; no SSR errors

### Phase 4: Tests

**Commit:** `test([scope]): [description]`

- [ ] Invoke `@test-writer`: "Read docs/specs/[feature-slug].md, write failing Vitest tests for each AC. Do NOT write implementation."
- [ ] Verify all new tests fail before implementation
- [ ] After implementation, all tests pass
- [ ] Add Playwright e2e smoke test if user-facing

### Phase 5: Integration

**Commit:** `feat([scope]): complete [feature name] integration`

- [ ] Wire components into page / route
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` — all exit 0
- [ ] Manual smoke test in browser

## Risks

| Risk | Likelihood   | Impact       | Mitigation |
| ---- | ------------ | ------------ | ---------- |
|      | Low/Med/High | Low/Med/High |            |

## Human Review Required

- [ ] Auth middleware changes? (Clerk config, protected routes, `protectedProcedure`)
- [ ] Database schema changes? (Prisma migrations — check for data loss)
- [ ] New environment variables or secrets?
- [ ] WebSocket connection limit or rate limiting changes?

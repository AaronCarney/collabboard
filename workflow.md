# Development Workflow — CollabBoard

## Feature Development Flow

Every feature follows this 10-step sequence:

1. **`/plan [feature-name]`** — Read spec, identify dependencies, create `docs/plans/[feature].md` with phased tasks
2. **`/conductor:newTrack [feature-name]`** — Generate `docs/specs/[feature].md` (acceptance criteria) and `docs/plans/[feature].md` (phased implementation)
3. **`@test-writer`** — Invoke test-writer subagent: "Read docs/specs/[feature].md, write failing Vitest tests for each AC. Do NOT write implementation."
4. **Verify tests fail** — Run `pnpm test`. If any new test passes before implementation, the test is wrong — fix it.
5. **`/implement [feature-name]`** — TDD: RED → GREEN → REFACTOR per test. Run `pnpm test` after each step.
6. **`@code-reviewer`** — Invoke code-reviewer subagent with the list of changed files.
7. **Fix BLOCKING issues** — Address all BLOCKING items from the review. Re-run reviewer if significant changes made.
8. **Verify:** `pnpm typecheck && pnpm lint && pnpm test && pnpm build` — all must exit 0.
9. **Commit:** `git commit -m "feat(scope): description\n\nCo-authored-by: Claude <noreply@anthropic.com>"`
10. **`gh pr create`** — Open PR; CI runs automatically; merge after ai-review and all checks pass.

## Sprint Cadence

**Daily:**

- Update `docs/tasks.md` — move completed tasks to Done, add newly discovered tasks to Up Next
- Run `/cost` after each major task — compact if >50k tokens

**Sprint end (weekly):**

- Review and update `CLAUDE.md` — remove stale rules, add new invariants from this sprint
- Review `docs/architecture.md` — update any changed performance budgets or architecture decisions
- `pnpm test:coverage` — check coverage trend; raise thresholds if above minimums

**After architectural decision:**

- Update `docs/architecture.md` and `tech-stack.md` immediately
- Update `CLAUDE.md` if the decision introduces a new invariant
- Add a note to `docs/research/` with the decision rationale

## Context Hygiene

- `/clear` between unrelated tasks (switching from canvas work to CI debugging)
- `/compact` when context grows large mid-task (triggered by `/cost` showing >50k tokens)
- Each project gets its own terminal session — never reuse a session across projects
- Each project has its own `.mcp.json` — never share MCP config across projects
- When switching tasks: `/clear`, then re-read `CLAUDE.md` by saying "Read the project CLAUDE.md"

## Branch Naming

```
feat/PROJ-[issue]-[short-description]    # New feature
fix/PROJ-[issue]-[short-description]     # Bug fix
chore/[short-description]                # Tooling, config, docs
test/[short-description]                 # Test-only changes
```

Examples:

- `feat/PROJ-12-canvas-cursor-sync`
- `fix/PROJ-15-do-connection-limit`
- `chore/upgrade-vitest-2.2`

## Conventional Commits

Format: `type(scope): description`

| Type       | Use                                      |
| ---------- | ---------------------------------------- |
| `feat`     | New feature                              |
| `fix`      | Bug fix                                  |
| `test`     | Adding or fixing tests                   |
| `chore`    | Tooling, config, deps                    |
| `refactor` | Code restructure without behavior change |
| `perf`     | Performance improvement                  |
| `docs`     | Documentation only                       |
| `ci`       | GitHub Actions / CI changes              |

Always add: `Co-authored-by: Claude <noreply@anthropic.com>`

## Human Review Gates (Non-Delegatable)

A human must read the full diff before merge for:

- Auth middleware changes (Clerk config, protected routes, `protectedProcedure`)
- Database schema changes (Prisma migrations — review for data loss)
- Data access mutations (new Supabase queries — verify RLS applies)
- Secrets or environment variable additions
- WebSocket connection limit or rate limiting changes (impacts all users)

CI passing is not sufficient for these changes. Assign yourself as reviewer and read line by line.

## Fallback Procedure

If Conductor is unavailable or rate-limited:

1. **Write spec manually** — Create `docs/specs/[feature].md` with this structure:

   ```
   ## Feature Description
   ## Acceptance Criteria (numbered)
   ## Test Cases
   ## Out of Scope
   ## Dependencies
   ## Performance Requirements
   ```

2. **Write plan manually** — Create `docs/plans/[feature].md` with:

   ```
   ## Source Spec
   ## New Dependencies
   ## Database Changes
   ## Implementation Phases (1-5 matching schema→backend→frontend→tests→integration)
   ## Risks
   ## Human Review Required
   ```

3. Continue with step 3 of the Feature Development Flow (invoke @test-writer)

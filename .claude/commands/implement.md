# /implement — TDD Implementation Command

**Usage:** `/implement <feature-name>`

**Prerequisites:** Spec exists at `docs/specs/<feature-name>.md`, plan exists at `docs/plans/<feature-name>.md`

---

## Process (6 Steps — Do Not Skip)

### Step 1: RED — Write Failing Tests

```
Invoke subagent: @test-writer
Prompt: "Read docs/specs/<feature-name>.md and the test cases in docs/plans/<feature-name>.md.
Write failing Vitest tests for each acceptance criterion. Do NOT write any implementation code."
```

Run tests. **Verify they fail.** If a test passes before implementation, it is testing the wrong thing — fix it before continuing.

### Step 2: GREEN — Implement to Pass Tests

Work through each failing test in order:

- Write the minimum code to make this test pass
- Do not over-engineer — no abstractions not required by a test
- Run tests after each implementation step

### Step 3: REFACTOR — Clean While Green

Only when ALL tests are green:

- Remove duplication
- Improve names
- Extract helpers if used in 3+ places
- Run tests after every refactor step — never refactor with red tests

### Step 4: VERIFY — Run the Full Check Sequence

```bash
pnpm typecheck     # Must exit 0
pnpm lint          # Must exit 0 (no warnings either with --max-warnings=0)
pnpm test          # Must exit 0, all tests pass
pnpm build         # Must exit 0
```

Do not proceed to Step 5 until all 4 exit 0.

### Step 5: REVIEW — Invoke Code Reviewer

```
Invoke subagent: @code-reviewer
Prompt: "Review the implementation of <feature-name>. The spec is at docs/specs/<feature-name>.md.
Changed files: <list files changed>."
```

If verdict is **REQUEST CHANGES**: fix all BLOCKING issues, re-run Step 4, then re-run Step 5.

### Step 6: COMMIT — Conventional Commits

```bash
git add <specific files — never git add .>
git commit -m "feat(<scope>): <description>

- <what changed>
- <why it changed>
- Tests: <number> passing

Co-authored-by: Claude <noreply@anthropic.com>"
```

---

## Scope Reference

| Scope      | Use when                       |
| ---------- | ------------------------------ |
| `web`      | Next.js app changes            |
| `realtime` | Cloudflare Worker / DO changes |
| `db`       | Prisma schema, migrations      |
| `shared`   | Zod schemas, shared types      |
| `ui`       | packages/ui component changes  |
| `api`      | tRPC router changes            |
| `test`     | Test-only changes              |
| `ci`       | GitHub Actions, tooling        |

---

## Abort Conditions

Stop and ask for human guidance if:

- Tests remain failing after 15 minutes of debugging
- Any implementation requires an `any` type that can't be fixed with proper generics
- A required npm package does not exist (`npm view <package>` returns 404)
- A database migration is destructive (column drop, type change on populated table)
- Implementation requires bypassing a security invariant (e.g., skipping auth on a mutation)

# AI Agent Upgrade — Agent Dispatch Plan

## Batching Strategy

12 tasks across 4 phases. Each phase goes through the full SDLC pipeline as one batch.
File overlap within phases is handled by giving each phase's implementer all tasks in that phase.

## Phase → Pipeline Mapping

### Round 1: Phase 1 — Tool & Schema Improvements (Tasks 1-3)

**New files:** `colors.ts`, `validation.ts`
**Modified files:** `tools.ts`, `command-router.ts`
**Test files:** `colors.test.ts`, `validation.test.ts`, `tools.test.ts` (additions)

| Step | Agent              | Input                                   | Gate                                       |
| ---- | ------------------ | --------------------------------------- | ------------------------------------------ |
| 1.1  | `tdd-writer`       | Spec AC-1,2,3 + existing tools.test.ts  | Tests exist and FAIL                       |
| 1.2  | `implementer`      | Spec + plan Tasks 1-3 + test file paths | All tests PASS                             |
| 1.3  | `verifier`         | —                                       | typecheck + lint + test + build = 0 errors |
| 1.4a | `reviewer`         | Changed files                           | APPROVE                                    |
| 1.4b | `security-auditor` | Changed files                           | No critical findings                       |
| 1.5  | `test-writer`      | Coverage gaps from review               | New tests pass                             |
| 1.6  | `committer`        | All phase 1 files                       | Conventional commit                        |

**Parallelism:** 1.4a ∥ 1.4b (both read-only)

### Round 2: Phase 2 — Context Engineering (Tasks 4-6)

**New files:** `context-pruning.ts`, `collision.ts`
**Modified files:** `system-prompt.ts`, `command-router.ts`, `route.ts`, `page.tsx`
**Test files:** `context-pruning.test.ts`, `collision.test.ts`, `system-prompt.test.ts` (additions)

| Step | Agent              | Input                                   | Gate                                       |
| ---- | ------------------ | --------------------------------------- | ------------------------------------------ |
| 2.1  | `tdd-writer`       | Spec AC-4,5,6 + existing test files     | Tests exist and FAIL                       |
| 2.2  | `implementer`      | Spec + plan Tasks 4-6 + test file paths | All tests PASS                             |
| 2.3  | `verifier`         | —                                       | typecheck + lint + test + build = 0 errors |
| 2.4a | `reviewer`         | Changed files                           | APPROVE                                    |
| 2.4b | `security-auditor` | Changed files                           | No critical findings                       |
| 2.5  | `test-writer`      | Coverage gaps                           | New tests pass                             |
| 2.6  | `committer`        | All phase 2 files                       | Conventional commit                        |

**Parallelism:** 2.4a ∥ 2.4b

### Round 3: Phase 3 — Selection, Memory & Templates (Tasks 7-9)

**New files:** `session-memory.ts`
**Modified files:** `route.ts`, `command-router.ts`, `system-prompt.ts`, `context-pruning.ts`, `templates.ts`
**Test files:** `session-memory.test.ts`, `system-prompt.test.ts` (additions), `templates.test.ts` (additions)

Note: Tasks 7 & 8 share route.ts, so they cannot be fully parallelized at implementation.
TDD tests CAN be written in parallel (tests don't conflict).

| Step | Agent              | Input                                   | Gate                                       |
| ---- | ------------------ | --------------------------------------- | ------------------------------------------ |
| 3.1  | `tdd-writer`       | Spec AC-7,8,9 + existing test files     | Tests exist and FAIL                       |
| 3.2  | `implementer`      | Spec + plan Tasks 7-9 + test file paths | All tests PASS                             |
| 3.3  | `verifier`         | —                                       | typecheck + lint + test + build = 0 errors |
| 3.4a | `reviewer`         | Changed files                           | APPROVE                                    |
| 3.4b | `security-auditor` | Changed files                           | No critical findings                       |
| 3.5  | `test-writer`      | Coverage gaps                           | New tests pass                             |
| 3.6  | `committer`        | All phase 3 files                       | Conventional commit                        |

**Parallelism:** 3.4a ∥ 3.4b

### Round 4: Phase 4 — UX & Integration (Tasks 10-12)

**New files:** `error-handler.ts`, `ai-queue.ts`
**Modified files:** `AiCommandBar.tsx`, `page.tsx`, `board-keyboard.ts`, `command-router.ts`, `route.ts`, `board-commands.ts`
**Test files:** `error-handler.test.ts`, `ai-queue.test.ts`, `AiCommandBar.test.tsx` (additions), `board-commands.test.ts` (additions)

Note: Tasks 10 & 12 share page.tsx. Tasks 11 & 12 share route.ts.

| Step | Agent              | Input                                     | Gate                                       |
| ---- | ------------------ | ----------------------------------------- | ------------------------------------------ |
| 4.1  | `tdd-writer`       | Spec AC-10,11,12 + existing test files    | Tests exist and FAIL                       |
| 4.2  | `implementer`      | Spec + plan Tasks 10-12 + test file paths | All tests PASS                             |
| 4.3  | `verifier`         | —                                         | typecheck + lint + test + build = 0 errors |
| 4.4a | `reviewer`         | Changed files                             | APPROVE                                    |
| 4.4b | `security-auditor` | Changed files                             | No critical findings                       |
| 4.5  | `test-writer`      | Coverage gaps                             | New tests pass                             |
| 4.6  | `committer`        | All phase 4 files                         | Conventional commit                        |

**Parallelism:** 4.4a ∥ 4.4b

### Final: Documentation

| Step | Agent        | Input                   | Gate         |
| ---- | ------------ | ----------------------- | ------------ |
| 5.1  | `documenter` | All changed public APIs | Docs updated |

## Dependency Graph

```
Round 1 ──→ Round 2 ──→ Round 3 ──→ Round 4 ──→ Documentation
  │            │            │            │
  tdd          tdd          tdd          tdd
  ↓            ↓            ↓            ↓
  impl         impl         impl         impl
  ↓            ↓            ↓            ↓
  verify       verify       verify       verify
  ↓            ↓            ↓            ↓
  review ∥     review ∥     review ∥     review ∥
  security     security     security     security
  ↓            ↓            ↓            ↓
  test-writer  test-writer  test-writer  test-writer
  ↓            ↓            ↓            ↓
  commit       commit       commit       commit
```

## Agent Count Summary

- 4 × tdd-writer = 4 agents
- 4 × implementer = 4 agents
- 4 × verifier = 4 agents
- 4 × reviewer = 4 agents
- 4 × security-auditor = 4 agents
- 4 × test-writer = 4 agents
- 4 × committer = 4 agents
- 1 × documenter = 1 agent
- Total: 29 agent spawns (+ potential fix cycles)

## Risk Mitigations

1. **File overlap:** Each phase is a single batch — one implementer handles all file edits within the phase
2. **Cascading failures:** If Phase N breaks Phase N-1's tests, the verifier catches it immediately
3. **Review cycles:** Max 2 review rounds before escalating to human
4. **Context pressure:** Fresh agents per phase — no compaction risk

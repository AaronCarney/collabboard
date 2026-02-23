# Next Session Prompt

Copy-paste below the line into a new Claude Code session.

---

Continue the CollabBoard audit bug fix plan. Read `docs/plans/remaining-audit-fixes.md` for full status.

## What's done

Commits A, B, C, D and the test fix are all committed and green (1132 tests). The board-limit flaky test is fixed (root cause was unstable useUser mock reference causing useEffect re-fetch churn).

## Pre-existing uncommitted changes

The working tree has uncommitted changes from PRIOR sessions (AI system overhaul, not audit fixes). Before implementing remaining audit commits, you need to:

1. Review these uncommitted changes (`git diff --name-only` to see them)
2. Categorize them — some may be valid prior work that should be committed, others may be stale
3. Either commit them (if tests pass) or stash/revert them if they're incomplete

Key concern: `packages/ui/package.json` is deleted in the working tree, which causes a lint-staged warning on every commit ("Failed to read config from file"). This should be resolved.

## Remaining audit fixes to implement (Commits E through J)

All are P3 priority. Implement in order with TDD:

- **E**: Remove `eslint-disable` comments + fix `as BoardObject` casts — add explicit return types, use Zod parse
- **F**: Pointer events for touch support — convert MouseEvent to PointerEvent, add `touch-action: none`
- **G**: Fix code-reviewer agent tRPC refs — replace tRPC references with actual stack (Supabase + REST)
- **H**: Replace `window.confirm` with `<dialog>` — native dialog element in dashboard delete flow
- **I**: Replace `waitForTimeout` in E2E specs — 19 occurrences across 6 files, use proper waitFor patterns
- **J**: CSRF + session-memory docs — document CSRF posture, add serverless caveat comment

See the plan file for details on each.

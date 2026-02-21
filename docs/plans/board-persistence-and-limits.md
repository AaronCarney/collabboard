# Plan: Board Persistence & Free-Tier Board Limit

## Overview

Three changes: (1) persist board name on edit, (2) load board name on mount, (3) enforce 5-board limit for free users.

## Files to Modify

| File                                        | Change                                                           |
| ------------------------------------------- | ---------------------------------------------------------------- |
| `apps/web/src/app/board/[boardId]/page.tsx` | Load board name from DB on mount; pass save handler to MenuBar   |
| `apps/web/src/components/board/MenuBar.tsx` | Debounced save callback on name change                           |
| `apps/web/src/app/dashboard/page.tsx`       | Board count check, disable create button at limit, limit message |
| `packages/shared/src/constants.ts` (new)    | `FREE_TIER_BOARD_LIMIT = 5` constant                             |

## Phase 1: Board Name Persistence

### 1a. Load board name from DB on mount

- In `BoardPage`, add a `useEffect` that fetches the board record: `supabase.from("boards").select("name").eq("id", boardId).single()`
- Set `boardName` state from the fetched value
- If board not found, redirect to `/dashboard` with error toast

### 1b. Save board name to DB on change

- In `BoardPage`, create a `saveBoardName` function that updates `boards.name` and `updated_at`
- Debounce the save (500ms) so typing doesn't cause excessive writes
- Pass debounced save as `onBoardNameChange` to `MenuBar`
- MenuBar already calls `onBoardNameChange` on blur/Enter — wire through to DB

## Phase 2: Board Limit

### 2a. Shared constant

- Create `packages/shared/src/constants.ts` with `export const FREE_TIER_BOARD_LIMIT = 5`
- Export from package index

### 2b. Dashboard enforcement

- After `loadBoards()`, track `boards.length`
- If `boards.length >= FREE_TIER_BOARD_LIMIT`:
  - Disable "+ New Board" button (gray out, `cursor-not-allowed`)
  - Show limit message below the button
- In `createBoard()`, add a guard: if at limit, show error toast and return early
- This is a client-side check; RLS server-side enforcement is out of scope (no paid tier yet)

## Phase 3: Verification

- `pnpm typecheck && pnpm lint && pnpm test && pnpm build`

## Agent Dispatch Sequence

```
1. tdd-writer     → Write failing tests for AC1-AC5
   Gate: tests FAIL (red phase)

2. implementer    → Make all tests pass
   Gate: tests PASS (green phase)

3. verifier       → typecheck + lint + test + build
   Gate: all four pass

4. reviewer + security-auditor  (parallel)
   Gate: reviewer APPROVE, no critical findings

5. test-writer    → Coverage gaps, edge cases
   Gate: new tests pass

6. committer      → Conventional commit
```

## Dependency Graph

```
tdd-writer ──→ implementer ──→ verifier ──→ ┬─ reviewer
                                             └─ security-auditor
                                                     ↓
                                              test-writer ──→ committer
```

# Security Fixes Plan — SEC-001 through SEC-005

## Context

Security audit identified 3 HIGH and 2 MEDIUM findings in the board sharing and read-only access implementation. This plan addresses all 5 actionable findings (SEC-006/007 are LOW and deferred).

## Findings to Fix

| ID      | Severity | Summary                                                                    |
| ------- | -------- | -------------------------------------------------------------------------- |
| SEC-001 | HIGH     | Share token `boardId` not cross-checked against URL `boardId`              |
| SEC-002 | HIGH     | Server `/api/share/validate` omits `valid: true` — share links always fail |
| SEC-003 | HIGH     | 9 mutation handlers lack `readOnly` guards                                 |
| SEC-004 | MEDIUM   | `?debug` URL param enables verbose logging for any user in production      |
| SEC-005 | MEDIUM   | AI command bar accessible to read-only share visitors                      |

## Implementation Steps

### Step 1: SEC-002 — Fix validate API response (TDD)

**Test first:** Add test to `apps/web/src/app/api/share/validate/__tests__/route.test.ts` (new file) asserting the response includes `valid: true` when token is valid.

**Impl:** In `apps/web/src/app/api/share/validate/route.ts` line 25, add `valid: true` to the response JSON.

**Files:** `apps/web/src/app/api/share/validate/route.ts`, new test file

### Step 2: SEC-001 — Cross-check boardId in share token validation

**Test first:** Add tests to `apps/web/src/lib/__tests__/share-access.test.ts`:

- Token valid but `boardId` doesn't match URL board → returns invalid
- Token valid and `boardId` matches → returns valid

**Impl:** In `apps/web/src/app/board/[boardId]/page.tsx` share validation effect (line 106-116), after `result.valid`, compare `result.boardId` against `boardId` from URL params. If mismatch, treat as invalid.

**Files:** `apps/web/src/app/board/[boardId]/page.tsx`, `apps/web/src/lib/__tests__/share-access.test.ts`

### Step 3: SEC-003 — Add readOnly guards to all mutation handlers

**Test first:** No new test file needed — the readOnly guard is a simple early-return pattern. The existing test coverage for these handlers doesn't test readOnly (they don't render the full page with share context). We'll add a focused integration-style test for the readOnly guards.

**Impl:** Add `if (readOnly) return;` to these handlers in `page.tsx`:

- `handleObjectsMove` (line 281)
- `handleObjectResize` (line 305)
- `handleTextSave` (line 312)
- `handleDelete` (line 348)
- `handleUpdateObjects` (line 360)
- `handlePaste` (line 378)
- `handleDuplicate` (line 391)
- `handleBoardNameChange` (line 119)
- `handleAiSubmit` (line 467)
- `handleObjectClick` (line 271) — prevents entering edit mode
- `handleDoubleClick` (line 288) — prevents entering edit mode

Also gate keyboard shortcuts: in the `createBoardKeyHandler` effect (line 400), pass `readOnly` and skip mutation keys when true.

**Files:** `apps/web/src/app/board/[boardId]/page.tsx`

### Step 4: SEC-005 — Hide AI bar and editing UI for read-only viewers

**Impl:** In `page.tsx`:

- Conditionally render `AiCommandBar` only when `!readOnly`
- Conditionally render `PropertyPanel` only when `!readOnly`
- Pass `readOnly` to `MenuBar` to disable board name editing and hide edit menu items
- Hide `Sidebar` tool palette when `readOnly` (viewers shouldn't see drawing tools)
- Don't show `ShareDialog` for read-only viewers

**Files:** `apps/web/src/app/board/[boardId]/page.tsx`, `apps/web/src/components/board/MenuBar.tsx`

### Step 5: SEC-004 — Remove debug URL param from production

**Impl:** In `apps/web/src/lib/board-store.ts` line 14-16, remove the `window.location.search` branch. Keep only the `process.env.NEXT_PUBLIC_DEBUG_REALTIME` env var check.

**Files:** `apps/web/src/lib/board-store.ts`

### Step 6: Verification

Run full verification gate: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`

## File Ownership

All changes are in `apps/web/src/` — single-developer scope, no file conflicts.

## Risk Assessment

- SEC-002 is a one-line fix with high confidence
- SEC-001 is a simple comparison + early return
- SEC-003 is mechanical (add guards to 11 handlers)
- SEC-004 is a one-line removal
- SEC-005 is conditional rendering — straightforward but touches several JSX blocks

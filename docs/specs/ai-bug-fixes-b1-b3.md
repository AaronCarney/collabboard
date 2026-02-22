# Spec: AI Bug Fixes B1-B3

## Problem Statement

Three bugs in the AI command pipeline compromise reliability:

1. **B1 — Deletion not persisted:** `route.ts` upserts `result.objects` but ignores `result.deletedIds`. Objects marked for deletion by the `deleteObject` tool are never removed from the database.
2. **B2 — Concurrency queue disconnected:** `ai-queue.ts` exports `enqueueForUser()` but `route.ts` calls `routeCommand()` directly, allowing concurrent requests from the same user to race.
3. **B3 — Tool naming inconsistency:** 8 tools use camelCase, 2 use snake_case (`create_connector`, `delete_object`). Inconsistent naming breaks conventions and complicates refactoring.

## Acceptance Criteria

### B1 — Deletion Persistence

- **AC1:** Given a command that deletes objects, when the AI returns `deletedIds`, then those objects are deleted from `board_objects` in the database.
- **AC2:** Given a command that both creates and deletes objects, when the AI returns both `objects` and `deletedIds`, then creates are upserted AND deletes are removed in a single handler execution.
- **AC3:** Given a command that deletes objects but the delete query fails, then the route returns an appropriate error and does not return a partial success.

### B2 — Concurrency Queue

- **AC4:** Given two concurrent AI commands from the same user, when both arrive at the route handler, then the second waits for the first to complete before executing.
- **AC5:** Given a queued command where the first command fails, then the second command still executes (no stuck queue).
- **AC6:** Given commands from different users, they execute concurrently (no cross-user blocking).

### B3 — Tool Naming

- **AC7:** All tool names in `getToolDefinitions()` use camelCase: `create_connector` → `createConnector`, `delete_object` → `deleteObject`.
- **AC8:** The `dispatchToolCall` switch in `command-router.ts` matches the renamed tools.
- **AC9:** All existing tests pass with updated tool names.

## Out of Scope

- Upstash Redis migration (Phase 1.3) — B2 fix uses the existing in-memory queue
- Plan-then-execute architecture (Phase 1.1) — these are fixes to the current tool-calling flow
- New test infrastructure — use existing vitest + mock patterns

## Affected Files

| File                                                      | Changes                                                                     |
| --------------------------------------------------------- | --------------------------------------------------------------------------- |
| `apps/web/src/app/api/ai/command/route.ts`                | B1: add delete query after upsert. B2: wrap routeCommand in enqueueForUser  |
| `apps/web/src/lib/ai/ai-queue.ts`                         | B2: no changes needed (already correct)                                     |
| `apps/web/src/lib/ai/tools.ts`                            | B3: rename create_connector → createConnector, delete_object → deleteObject |
| `apps/web/src/lib/ai/command-router.ts`                   | B3: update switch cases                                                     |
| `apps/web/src/lib/ai/__tests__/tools.test.ts`             | B3: update tool name assertions                                             |
| `apps/web/src/lib/ai/__tests__/command-router.test.ts`    | B3: update tool name references                                             |
| `apps/web/src/app/api/ai/command/__tests__/route.test.ts` | B1+B2: add deletion and concurrency tests                                   |

## File Ownership

- **tdd-writer:** `**/ai/**/__tests__/*.test.ts`, `**/api/ai/**/__tests__/*.test.ts` (test files only)
- **implementer:** `**/ai/command/route.ts`, `**/ai/tools.ts`, `**/ai/command-router.ts`, `**/ai/ai-queue.ts` (source files only)

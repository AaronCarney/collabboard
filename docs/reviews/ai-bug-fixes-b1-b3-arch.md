# Architectural Review: AI Bug Fixes B1-B3

**Reviewer:** reviewer agent (Architectural mode)
**Date:** 2026-02-21
**Spec:** `docs/specs/ai-bug-fixes-b1-b3.md`
**Plan context:** `docs/plans/ai-system-overhaul.md`

---

## 1. B1 -- Deletion Persistence: Atomicity Concern

### Observation

The route handler (`apps/web/src/app/api/ai/command/route.ts`, lines 121-177) performs the upsert and delete as two independent Supabase calls with no transaction wrapper:

```typescript
// Upsert (line 123)
const { error: upsertError } = await supabaseAdmin.from("board_objects").upsert(result.objects);

// ... broadcast in between ...

// Delete (line 166)
const { error: deleteError } = await supabaseAdmin
  .from("board_objects")
  .delete()
  .in("id", result.deletedIds);
```

**Issue (MEDIUM):** If the upsert succeeds but the delete fails, the handler returns a 500 error to the client, but the upserted objects are already committed to the database. The client sees a failure but the database is in a partially-applied state. AC3 says "does not return a partial success," but the current implementation does exactly that -- objects are persisted, deletions are not, and the client gets a 500.

Additionally, the broadcast fires between upsert and delete (lines 131-161). If the delete subsequently fails, connected clients have already received the new objects via the `ai:result` broadcast but the deletions never happened. The client-side board state is now inconsistent with the database.

**Should they be in a transaction?** Yes, ideally. However, Supabase JS client v2 does not expose a transaction API for chained operations across different query types (upsert + delete). The practical options are:

1. **Postgres function (RPC):** Create a `perform_ai_mutations(upserts jsonb[], delete_ids uuid[])` function that runs both operations in a single transaction. Call via `supabaseAdmin.rpc()`.
2. **Delete-first ordering:** Delete before upsert. If delete fails, nothing was modified. If upsert fails after delete, the damage is limited to orphaned deletions (recoverable). This is simpler but not truly atomic.
3. **Accept the current approach** with the understanding that Phase 1.1 (plan-then-execute) will introduce atomic execution via Postgres transactions anyway.

**Recommendation:** Option 3 is acceptable for now given the planned Phase 1.1 migration, but (a) move the broadcast to AFTER both database operations succeed, and (b) add a code comment noting the non-atomic gap. The broadcast-before-delete ordering is a real bug that should be fixed.

### Upsert failure is silently swallowed

**Issue (HIGH):** When the upsert fails (line 127-129), the handler logs a warning but continues to return a 200 success response to the client. The objects were not persisted, but the client is told the operation succeeded. Meanwhile, the broadcast may also fire, telling other clients about objects that do not exist in the database. This predates B1 but the B1 changes make it worse because the handler now has two independent failure points that can produce inconsistent results.

**File:** `apps/web/src/app/api/ai/command/route.ts`, lines 127-129
**Suggested fix:** Return a 500 on upsert failure, consistent with how delete failure is handled.

---

## 2. B2 -- In-Memory Queue: Appropriateness

### Design fitness

The in-memory queue (`apps/web/src/lib/ai/ai-queue.ts`) is a promise-chaining pattern: each new request for the same user chains onto the previous promise. This is correct for a single-process Node.js server.

**Observation (LOW -- acknowledged):** The module-level comment already documents the limitation: "not safe for multi-instance serverless." This is fine because:

- The spec explicitly marks Upstash Redis as out of scope.
- The overhaul plan schedules this as Phase 1.3.
- Next.js on Vercel runs in serverless functions where each invocation may be a separate process, meaning this queue provides no actual serialization guarantee in production. However, this is a known limitation being addressed in Phase 1.3.

**Forward-compatibility note:** The `enqueueForUser` API signature (`userId: string, fn: () => Promise<T>`) is a clean abstraction. Swapping the implementation to Redis-based locking in Phase 1.3 should not require changes to `route.ts` -- only to `ai-queue.ts` internals. The interface is well-designed for migration.

### Queue wiring -- new failure modes

**Issue (LOW):** The queue implementation uses `.then(() => fn(), () => fn())` (line 6-8), meaning if the previous promise rejects, `fn()` still executes. This is correct behavior per AC5. However, there is a subtle issue: if `fn()` itself throws synchronously (not returning a promise), the queue entry will reject and the `finally` cleanup will run, but the `activeCommands` Map entry may briefly hold a rejected promise. This is unlikely in practice since `routeCommand` is async, but worth noting.

No new failure modes are introduced by the wiring in `route.ts`. The `enqueueForUser` call wraps the entire `routeCommand` invocation, and errors propagate naturally through the try/catch in the route handler (line 187).

---

## 3. B3 -- Tool Rename Completeness

### Renamed locations (verified complete)

| Location                                             | Status                                                   |
| ---------------------------------------------------- | -------------------------------------------------------- |
| `tools.ts` `getToolDefinitions()` -- tool names      | DONE (lines 303, 307: `createConnector`, `deleteObject`) |
| `command-router.ts` `executeToolCall()` switch cases | DONE (lines 231, 237: `createConnector`, `deleteObject`) |
| `tools.test.ts` -- AC7 assertions                    | DONE (lines 388-397)                                     |
| `command-router.test.ts` -- AC8 assertions           | DONE (lines 144, 196)                                    |

### Stale reference found

**Issue (MEDIUM):** `apps/web/src/lib/ai/__tests__/validation.test.ts` line 141 still passes `"create_connector"` as the tool name to `validateToolCallArgs()`. The current `validateToolCallArgs` implementation ignores the tool name parameter (it is `_toolName`), so this does not cause a test failure. However, it is inconsistent and will become a real bug if the validation function is later enhanced to use the tool name for tool-specific validation logic (which Phase 1.1 is likely to require).

**File:** `/home/context/projects/collabboard/apps/web/src/lib/ai/__tests__/validation.test.ts`, line 141
**Suggested fix:** Change `"create_connector"` to `"createConnector"`.

### System prompt -- no tool names referenced

The system prompt (`apps/web/src/lib/ai/system-prompt.ts`) does not enumerate tool names by string. It references tools generically ("Use the provided tools"). The Vercel AI SDK passes tool definitions to the model via the `tools` parameter, so the rename in `getToolDefinitions()` is sufficient. No system prompt changes needed.

### Templates -- no tool name references

`apps/web/src/lib/ai/templates.ts` generates `BoardObject[]` directly without going through tool calling. No tool name references found. Clean.

---

## 4. Forward-Compatibility: Interaction with Planned Phases

### Phase 1.1 (Plan-then-execute)

The overhaul plan says Phase 1.1 will replace tool-calling with structured output planning. This means:

- `getToolDefinitions()` and `executeToolCall()` will be removed or replaced entirely.
- The B3 rename is therefore short-lived work. However, it is still correct to fix it now because (a) there may be weeks between B3 and 1.1, and (b) consistency reduces cognitive overhead during the 1.1 migration.
- The `CommandResult.deletedIds` field introduced by B1 aligns well with the `PlanSchema.deletions` field in the Phase 1.1 schema. No conflict.

### Phase 1.3 (Upstash Redis)

- The B2 in-memory queue is a drop-in placeholder. The `enqueueForUser` interface is migration-ready.
- One consideration: Phase 1.3 plans to return 429 when a lock is held, while the current in-memory queue silently waits. This is a behavioral change that will need client-side handling when Phase 1.3 lands.

### Phase 2.2 (Streaming)

- The plan adds a new `/api/ai/command/stream` route alongside the existing one. The B1 deletion fix and B2 queue wiring in the existing route will need to be replicated in the streaming route. This is expected duplication that should be extracted into a shared persistence helper before or during Phase 2.2.

---

## 5. Summary

### Blocking Issues

1. **(HIGH) Upsert failure silently returns 200:** `route.ts` lines 127-129 log a warning on upsert failure but return success to the client. This is inconsistent with how delete failure is handled (returns 500) and can leave the client with a false positive. This predates B1 but the B1 changes make the inconsistency more visible.

### Non-Blocking Concerns

2. **(MEDIUM) Broadcast fires before delete completes:** The Supabase Realtime broadcast of new objects happens between the upsert and delete operations. If the delete fails, other clients have already received stale data. Move broadcast to after both DB operations succeed.

3. **(MEDIUM) Non-atomic upsert+delete:** Acknowledged as acceptable given Phase 1.1 will introduce transactions, but should be documented with a TODO comment.

4. **(MEDIUM) Stale tool name in validation test:** `validation.test.ts` line 141 still uses `"create_connector"`. Harmless today but inconsistent.

### Suggestions

5. **(LOW) Extract DB persistence into a helper function:** Both the current route and the future streaming route (Phase 2.2) will need upsert+delete+broadcast logic. Extracting `persistAiResult(boardId, objects, deletedIds)` now would reduce duplication later.

6. **(LOW) Document the in-memory queue limitation more prominently:** The module-level comment in `ai-queue.ts` is good, but a note in the route handler (where the queue is consumed) would help future developers understand why serialization may not work in multi-instance deployments.

---

## Verdict: CONCERNS

- **blocking_issues:** 1 item (upsert failure returns false 200)
- **suggestions:** 5 non-blocking items
- **human_review_required:** false (no auth/payment/data-access changes -- the auth check is pre-existing and unchanged)
- **status:** complete

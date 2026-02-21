# Spec: Board Persistence & Free-Tier Board Limit

## Problem

1. **Board name never persists** — Editing the board name in the MenuBar updates local React state only. The `boards.name` column is never updated. Returning to the dashboard always shows "Untitled Board".
2. **Board name never loads from DB** — The board page hardcodes `useState("Untitled Board")` instead of fetching from the `boards` table on mount.
3. **No board limit** — Any authenticated user can create unlimited boards. Free users should be capped at 5 boards.

## Scope

- Fix board name persistence (save on change, load on mount)
- Enforce a 5-board limit for free-tier users on board creation
- Content persistence is already working (fire-and-forget upserts in `board-store.ts`) — no changes needed there

## Acceptance Criteria

### AC1: Board name saves to database

- When a user edits the board name in the MenuBar and blurs or presses Enter, the new name is written to `boards.name` via Supabase
- The `updated_at` timestamp is updated automatically by the DB trigger (`update_updated_at` in `supabase-setup.sql`)
- No debounce needed — MenuBar only fires `onBoardNameChange` on blur/Enter, not per-keystroke
- Names are sanitized: trimmed, control characters stripped, truncated to 100 chars
- Empty/whitespace-only names are rejected (not saved)

### AC2: Board name loads from database on mount

- When the board page mounts, it fetches the board record from `boards` and sets the initial `boardName` state from `boards.name`
- The document title reflects the actual persisted name
- If the board is not found, the user is redirected to `/dashboard` with an error toast

### AC3: Dashboard shows persisted board names

- The dashboard `loadBoards()` already fetches `boards.*` — no change needed if names are persisted correctly
- Verify the dashboard card displays `board.name` (already does in JSX)

### AC4: Free users limited to 5 boards

- Before inserting a new board, the dashboard checks the user's board count
- If `count >= 5`, the create button is disabled and a message explains the limit
- The limit is enforced both client-side (UX) and server-side (RLS or check)
- The constant `FREE_TIER_BOARD_LIMIT = 5` is defined in a shared location

### AC5: Board limit feedback

- When a free user has 5 boards, the "+ New Board" button is visually disabled
- A message like "Free plan limit: 5 boards. Delete a board to create a new one." is shown
- Attempting to create a board when at the limit shows an error toast

## Out of Scope

- Paid tiers / Stripe integration
- Board content persistence changes (already working)
- Real-time board name sync between collaborators

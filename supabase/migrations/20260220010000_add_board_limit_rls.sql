-- Server-side enforcement of free-tier board limit (5 boards per user)
-- Prevents client-side bypass via direct Supabase API calls

create or replace function public.user_board_count(uid text)
returns bigint
language sql security definer stable
set search_path = public
as $$
  select count(*) from public.boards where created_by = uid
$$;

-- Replace the existing insert policy with one that enforces the limit
-- Limit value (5) must match FREE_TIER_BOARD_LIMIT in packages/shared/src/constants.ts
drop policy if exists "Users can create boards" on public.boards;
create policy "Users can create boards"
  on public.boards for insert
  with check (
    created_by = (auth.jwt()->>'sub')
    and public.user_board_count(auth.jwt()->>'sub') < 5
  );

-- Add board name length constraint
alter table public.boards
  add constraint boards_name_length check (char_length(name) between 1 and 100);

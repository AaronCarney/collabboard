-- ============================================================
-- CollabBoard MVP — Supabase Schema
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================
-- Requires Clerk JWT template "supabase" with HS256 signing
-- using the Supabase JWT Secret. The JWT must include:
--   "sub": "{{user.id}}", "aud": "authenticated", "role": "authenticated"
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- Boards table
-- ============================================================
create table public.boards (
  id uuid primary key default uuid_generate_v4(),
  name text not null default 'Untitled Board',
  created_by text not null, -- Clerk user ID
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.boards enable row level security;

-- RLS policies using auth.jwt() to read Clerk user ID from "sub" claim
create policy "Users can view own boards"
  on public.boards for select
  using (created_by = (auth.jwt()->>'sub'));

create policy "Users can create boards"
  on public.boards for insert
  with check (created_by = (auth.jwt()->>'sub'));

create policy "Users can update own boards"
  on public.boards for update
  using (created_by = (auth.jwt()->>'sub'));

create policy "Users can delete own boards"
  on public.boards for delete
  using (created_by = (auth.jwt()->>'sub'));

-- ============================================================
-- Board objects table
-- ============================================================
create table public.board_objects (
  id uuid primary key default uuid_generate_v4(),
  board_id uuid not null references public.boards(id) on delete cascade,
  type text not null check (type in ('sticky_note', 'rectangle', 'circle', 'text')),
  x double precision not null default 0,
  y double precision not null default 0,
  width double precision not null default 200,
  height double precision not null default 200,
  rotation double precision not null default 0,
  content text not null default '',
  color text not null default '#FFEB3B',
  version integer not null default 1,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.board_objects enable row level security;

-- For MVP: allow all authenticated users to CRUD board objects
-- (Real app would check board membership)
create policy "Users can view board objects"
  on public.board_objects for select
  using (true);

create policy "Users can create board objects"
  on public.board_objects for insert
  with check (true);

create policy "Users can update board objects"
  on public.board_objects for update
  using (true);

create policy "Users can delete board objects"
  on public.board_objects for delete
  using (true);

-- Index for fast board object lookups
create index idx_board_objects_board_id on public.board_objects(board_id);

-- Updated_at trigger
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger boards_updated_at
  before update on public.boards
  for each row execute function public.update_updated_at();

create trigger board_objects_updated_at
  before update on public.board_objects
  for each row execute function public.update_updated_at();

-- ============================================================
-- Enable Realtime
-- ============================================================
alter publication supabase_realtime add table public.board_objects;

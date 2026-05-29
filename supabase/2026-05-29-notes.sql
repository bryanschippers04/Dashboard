-- ============================================================
-- Notes to self. Quick-capture text snippets — ideas, things to
-- check out, gift hints, anything the user wants pinned briefly
-- without the structure of a todo or journal entry. Plain text +
-- created_at; everything else (star, archive, etc.) can come
-- later if it turns out to be useful.
-- 2026-05-29
-- ============================================================

create table if not exists public.notes (
  id          uuid         primary key default gen_random_uuid(),
  user_id     uuid         not null references auth.users(id) on delete cascade,
  text        text         not null check (length(text) > 0),
  created_at  timestamptz  not null default now()
);

create index if not exists idx_notes_user_created
  on public.notes (user_id, created_at desc);

alter table public.notes enable row level security;

drop policy if exists "users manage own notes" on public.notes;
create policy "users manage own notes"
  on public.notes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Sanity check:
--   select count(*) from public.notes;
-- Expect 0 on a fresh install.
-- ============================================================

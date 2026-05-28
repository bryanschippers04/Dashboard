-- ============================================================
-- Journal drafts. One rolling draft per user — pick up where
-- you left off in the morning, finalize at night by hitting
-- SAVE ENTRY (which inserts into journal_entries + deletes the
-- draft row).
-- 2026-05-28
-- ============================================================

create table if not exists public.journal_drafts (
  user_id     uuid          primary key references auth.users(id) on delete cascade,
  text        text          not null default '',
  rating      integer,
  mood_tags   text[],
  language    text          default 'nl-NL',
  updated_at  timestamptz   not null default now()
);

alter table public.journal_drafts enable row level security;

-- The browser writes directly via the supabase JS client (same as
-- journal_entries inserts). RLS guarantees you only touch your own row.
drop policy if exists "users manage own draft" on public.journal_drafts;
create policy "users manage own draft"
  on public.journal_drafts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- Sanity check:
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='journal_drafts'
--   order by column_name;
-- Expect: language, mood_tags, rating, text, updated_at, user_id.
-- ============================================================

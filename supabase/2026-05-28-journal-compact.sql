-- ============================================================
-- Adds a `text_compact` column to journal_entries. Stores a
-- Claude-condensed bullet list of the raw entry — newline-separated.
-- Display uses the compact version by default; raw text is kept and
-- can be expanded by click. Existing rows remain (text_compact NULL).
-- 2026-05-28
-- ============================================================

alter table public.journal_entries
  add column if not exists text_compact text;

-- ============================================================
-- Sanity check:
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='journal_entries'
--   order by column_name;
-- Expect a `text_compact` column to appear in the list.
-- ============================================================

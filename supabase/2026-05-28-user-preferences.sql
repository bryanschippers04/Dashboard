-- ============================================================
-- Per-user preferences. Currently holds Claude model overrides
-- for each category (assistant / weekly / daily / journal-compact),
-- but the table is intentionally extensible for future settings.
-- All columns nullable: NULL means "use the app default".
-- 2026-05-28
-- ============================================================

create table if not exists public.user_preferences (
  user_id                  uuid        primary key references auth.users(id) on delete cascade,
  model_assistant          text,
  model_insights_weekly    text,
  model_insights_daily     text,
  model_journal_compact    text,
  updated_at               timestamptz not null default now()
);

alter table public.user_preferences enable row level security;
-- Service-role only. Reads + writes flow through /api/preferences.

-- ============================================================
-- Sanity check:
--   select count(*) from public.user_preferences;
-- 0 on a fresh install. Rows are created lazily on first save.
-- ============================================================

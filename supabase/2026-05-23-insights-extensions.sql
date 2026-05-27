-- ============================================================
-- Schema additions to support the weekly insights design.
-- Paste this into Supabase → SQL Editor → New query → Run.
-- Safe to re-run; all changes use IF NOT EXISTS / IF EXISTS.
--
-- Companion design doc:
--   docs/superpowers/specs/2026-05-22-weekly-insights-prompt-design.md
-- ============================================================

-- --- 1) Insights table additions ---
-- The original schema has only `content` on insights. The new
-- design returns objects with title, body, optional verse, and
-- a week_start so we can group insights by which week they cover.

alter table public.insights
  add column if not exists title       text,
  add column if not exists body        text,
  add column if not exists verse       jsonb,
  add column if not exists week_start  date;

-- Keep `content` nullable so new inserts can use title/body instead.
-- (Older rows that filled `content` will still work.)
alter table public.insights
  alter column content drop not null;

-- Restrict insight_type to the four we actually use.
-- Drop the constraint if it exists (so we can recreate it), then add.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'insights_type_check'
  ) then
    alter table public.insights drop constraint insights_type_check;
  end if;
end$$;

alter table public.insights
  add constraint insights_type_check
  check (insight_type in ('pattern','action','win','warning'));

-- --- 2) Indexes for fast "this week" / "recent" queries ---

create index if not exists idx_journal_user_time
  on public.journal_entries (user_id, "timestamp" desc);

create index if not exists idx_todos_user_due
  on public.todos (user_id, due_date);

create index if not exists idx_goals_user_type
  on public.goals (user_id, type);

create index if not exists idx_transactions_user_date
  on public.transactions (user_id, date desc);

create index if not exists idx_insights_user_generated
  on public.insights (user_id, generated_at desc);

create index if not exists idx_insights_user_week
  on public.insights (user_id, week_start desc);

create index if not exists idx_screen_user_date
  on public.screen_time (user_id, date desc);

create index if not exists idx_plaid_user
  on public.plaid_items (user_id);

-- --- 3) Optional: period_start on goals ---
-- Useful later when we want to track which day/week/month a goal's
-- current_progress applies to. Nullable so existing rows are fine.

alter table public.goals
  add column if not exists period_start date;

-- ============================================================
-- Done. Sanity check:
--   select column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_schema = 'public' and table_name = 'insights';
-- Should now include: title, body, verse, week_start.
-- ============================================================

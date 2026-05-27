-- ============================================================
-- Insights "library" additions: starring + daily scope + weekly distillations.
-- Paste this into Supabase → SQL Editor → New query → Run.
-- Safe to re-run; all changes use IF NOT EXISTS / IF EXISTS.
-- 2026-05-28
-- ============================================================

-- --- 1) Star + daily scope on insights ---

alter table public.insights
  add column if not exists is_starred boolean not null default false,
  add column if not exists scope      text    not null default 'weekly',
  add column if not exists day        date;

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'insights_scope_check'
  ) then
    alter table public.insights drop constraint insights_scope_check;
  end if;
end$$;

alter table public.insights
  add constraint insights_scope_check check (scope in ('weekly','daily'));

create index if not exists idx_insights_user_starred
  on public.insights (user_id, is_starred) where is_starred;

create index if not exists idx_insights_user_day
  on public.insights (user_id, day desc) where day is not null;

-- --- 2) Weekly distillations: one terse 2-sentence summary per week ---
-- Acts as canonical long-term memory; always fed into future Claude runs.

create table if not exists public.insight_summaries (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  week_start  date        not null,
  summary     text        not null,
  created_at  timestamptz not null default now(),
  unique (user_id, week_start)
);

alter table public.insight_summaries enable row level security;
-- No client policies → service-role only (same pattern as manual_accounts,
-- recurring_expenses). All access flows through API routes.

create index if not exists idx_insight_summaries_user_week
  on public.insight_summaries (user_id, week_start desc);

-- ============================================================
-- Sanity check:
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='insights'
--   order by column_name;
-- Expect: is_starred, scope, day in addition to existing columns.
--
--   select count(*) from public.insight_summaries;
-- Should return 0 on a fresh install.
-- ============================================================

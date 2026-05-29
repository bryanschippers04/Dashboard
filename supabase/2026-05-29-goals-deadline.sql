-- ============================================================
-- Goals pivot: cadence (daily/weekly/monthly) -> deadline date.
-- The new habits table now owns recurring expectations, so goals
-- become aspirational targets ordered by urgency.
-- Existing rows are wiped on purpose (clean slate per user choice).
-- 2026-05-29
-- ============================================================

delete from public.goals;

alter table public.goals drop column if exists type;
alter table public.goals add  column if not exists deadline date;

create index if not exists idx_goals_user_deadline
  on public.goals (user_id, deadline);

-- ============================================================
-- Sanity check:
--   select column_name from information_schema.columns
--     where table_schema = 'public' and table_name = 'goals';
-- Expect: id, user_id, title, target, current_progress, deadline.
-- ============================================================

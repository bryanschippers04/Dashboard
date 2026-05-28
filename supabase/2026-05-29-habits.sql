-- ============================================================
-- Habit tracker. Separate from todos (one-shot) and goals
-- (count-based targets). Habits = recurring expectations scoped
-- daily / weekly / monthly with per-period completion logging
-- so streaks are real, not faked.
-- 2026-05-29
-- ============================================================

create table if not exists public.habits (
  id            uuid          primary key default gen_random_uuid(),
  user_id       uuid          not null references auth.users(id) on delete cascade,
  title         text          not null,
  cadence       text          not null check (cadence in ('daily','weekly','monthly')),
  target_count  integer       not null default 1 check (target_count >= 1),
  active        boolean       not null default true,
  sort_order    integer       not null default 0,
  created_at    timestamptz   not null default now()
);

create table if not exists public.habit_completions (
  id            uuid          primary key default gen_random_uuid(),
  habit_id      uuid          not null references public.habits(id) on delete cascade,
  user_id       uuid          not null references auth.users(id) on delete cascade,
  period_key    text          not null,   -- daily 'YYYY-MM-DD' | weekly 'YYYY-Www' | monthly 'YYYY-MM'
  occurred_at   timestamptz   not null default now()
);

create index if not exists idx_habit_completions_user_habit
  on public.habit_completions (user_id, habit_id, period_key);
create index if not exists idx_habits_user_active
  on public.habits (user_id) where active;

alter table public.habits            enable row level security;
alter table public.habit_completions enable row level security;

drop policy if exists "users manage own habits" on public.habits;
create policy "users manage own habits"
  on public.habits for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users manage own habit completions" on public.habit_completions;
create policy "users manage own habit completions"
  on public.habit_completions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Sanity check:
--   select count(*) from public.habits;
--   select count(*) from public.habit_completions;
-- Both 0 on a fresh install.
-- ============================================================

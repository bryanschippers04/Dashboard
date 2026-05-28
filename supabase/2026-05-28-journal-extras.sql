-- ============================================================
-- Adds quick-input fields to journal_entries (and journal_drafts):
--   sleep_minutes  integer  0..1440  (slider, 15-min granularity)
--   energy         integer  0..10    (parallel to existing rating)
--   productivity   integer  0..10
--   exercise       text              free-text ("30min run", "gym push day")
--   time_outside   text              one of 'none','<30m','30-60m','1h+'
-- All nullable so existing rows + drafts stay valid.
-- 2026-05-28
-- ============================================================

alter table public.journal_entries
  add column if not exists sleep_minutes       integer,
  add column if not exists energy              integer,
  add column if not exists productivity        integer,
  add column if not exists exercise            text,
  add column if not exists time_outside        text,
  add column if not exists phone_time_minutes  integer;

alter table public.journal_drafts
  add column if not exists sleep_minutes       integer,
  add column if not exists energy              integer,
  add column if not exists productivity        integer,
  add column if not exists exercise            text,
  add column if not exists time_outside        text,
  add column if not exists phone_time_minutes  integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'journal_entries_sleep_check'
  ) then
    alter table public.journal_entries
      add constraint journal_entries_sleep_check
      check (sleep_minutes is null or (sleep_minutes >= 0 and sleep_minutes <= 1440));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'journal_entries_energy_check'
  ) then
    alter table public.journal_entries
      add constraint journal_entries_energy_check
      check (energy is null or (energy >= 0 and energy <= 10));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'journal_entries_productivity_check'
  ) then
    alter table public.journal_entries
      add constraint journal_entries_productivity_check
      check (productivity is null or (productivity >= 0 and productivity <= 10));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'journal_entries_time_outside_check'
  ) then
    alter table public.journal_entries
      add constraint journal_entries_time_outside_check
      check (time_outside is null or time_outside in ('none','<30m','30-60m','1h+'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'journal_entries_phone_time_check'
  ) then
    alter table public.journal_entries
      add constraint journal_entries_phone_time_check
      check (phone_time_minutes is null or (phone_time_minutes >= 0 and phone_time_minutes <= 1440));
  end if;
end $$;

-- ============================================================
-- Sanity check:
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='journal_entries'
--   order by column_name;
-- Expect: energy, exercise, productivity, sleep_minutes, time_outside
-- alongside the existing columns.
-- ============================================================

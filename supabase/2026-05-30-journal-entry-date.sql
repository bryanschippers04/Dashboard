-- ============================================================
-- Late-night journal entries should count for the previous day.
-- Adds entry_date — the "logical day" the entry belongs to —
-- computed at insert as: local Europe/Amsterdam time minus a
-- 4h cutoff, then date-truncated. So 01:00 local on 2 Apr maps
-- to entry_date 2026-04-01.
--
-- timestamp keeps the real write time (for sort + display);
-- entry_date is what daily insights / "last entry" buckets on.
-- 2026-05-30
-- ============================================================

alter table public.journal_entries
  add column if not exists entry_date date;

-- Backfill existing rows with the same rule used going forward.
update public.journal_entries
   set entry_date = (((timestamp at time zone 'Europe/Amsterdam') - interval '4 hours')::date)
 where entry_date is null;

-- Default for any direct SQL inserts that don't set entry_date
-- (the API sets it explicitly, but the default keeps SQL inserts safe).
alter table public.journal_entries
  alter column entry_date set default (((now() at time zone 'Europe/Amsterdam') - interval '4 hours')::date);

-- Not NOT NULL — kept nullable so backfill of stragglers can run later
-- without blocking inserts. The default + API both populate it.

create index if not exists idx_journal_entries_user_entry_date
  on public.journal_entries (user_id, entry_date);

-- ============================================================
-- Sanity check:
--   select timestamp, entry_date
--     from public.journal_entries
--    order by timestamp desc limit 5;
-- entry_date should match timestamp::date for daytime entries,
-- and be one day earlier for entries written 00:00-03:59 local.
-- ============================================================

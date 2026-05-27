-- ============================================================
-- Provider sequence for tie-breaking same-day transactions.
-- Rabobank exposes booking dates without time-of-day, so when the
-- bank returns multiple transactions on the same date we fall back
-- to the order Enable Banking returned them in (idx 0 = newest).
-- 2026-05-28
-- ============================================================

alter table transactions
  add column if not exists provider_sequence smallint;

-- Existing rows stay NULL until the next sync re-upserts them.
-- The page query treats NULL as "no preference" via nullsLast equivalent.

create index if not exists idx_transactions_user_booked_seq
  on transactions (user_id, booked_at desc, provider_sequence asc);

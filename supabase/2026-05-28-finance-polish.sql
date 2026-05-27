-- ============================================================
-- Finance polish: per-transaction timestamps + counterparty IBAN
-- + manual account balance anchor timestamp
-- 2026-05-28
-- ============================================================

-- 1) Transactions: add timestamps for proper ordering + counterparty IBAN.
alter table transactions
  add column if not exists booked_at         timestamptz,
  add column if not exists created_at        timestamptz not null default now(),
  add column if not exists counterparty_iban text;

-- Backfill booked_at for existing rows (assume mid-day on the booked date)
-- so ordering works immediately for already-synced data.
update transactions
  set booked_at = (date::timestamptz + interval '12 hours')
  where booked_at is null;

create index if not exists idx_transactions_user_booked
  on transactions (user_id, booked_at desc);

-- 2) Manual accounts: anchor timestamp for the derived-balance math.
-- Whenever the user sets / edits balance, this is updated to now() in
-- /api/finance/manual-accounts. The displayed balance =
--   anchor + sum of transfers booked after this timestamp.
alter table manual_accounts
  add column if not exists balance_set_at timestamptz not null default now();

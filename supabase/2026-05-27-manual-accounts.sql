-- ============================================================
-- Manual accounts (e.g. "Vrij spaargeld") — savings or cash held
-- outside any linked bank API. User maintains the balance by hand.
-- 2026-05-27
-- ============================================================

create table if not exists manual_accounts (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  name        text        not null,
  iban        text,
  balance     numeric     not null default 0,
  currency    text        default 'EUR',
  updated_at  timestamptz not null default now()
);

alter table manual_accounts enable row level security;

-- No client policies → service-role only (same model as bank_accounts).
-- All reads/writes flow through /api/finance/manual-accounts.

-- ============================================================
-- Recurring expenses ("vaste lasten") — subscriptions and other
-- predictable charges. Manual entries here; auto-detected
-- recurring transactions are computed at read time from the
-- transactions table.
-- 2026-05-28
-- ============================================================

create table if not exists recurring_expenses (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  name        text        not null,
  amount      numeric     not null,
  currency    text        default 'EUR',
  frequency   text        not null
              check (frequency in ('weekly','monthly','quarterly','yearly')),
  source      text,
  active      boolean     not null default true,
  created_at  timestamptz not null default now()
);

alter table recurring_expenses enable row level security;

-- No client policies → service-role only access (same as manual_accounts).
-- All reads/writes flow through /api/finance/recurring.

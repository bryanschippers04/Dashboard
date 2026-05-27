-- ============================================================
-- Finance / Enable Banking integration migration
-- 2026-05-27
--
-- Run this in Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run.
-- ============================================================

-- 1) bank_accounts: one row per linked account under a consent/session.
-- A plaid_items row (consent) can have multiple bank_accounts (checking + savings).
create table if not exists bank_accounts (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  plaid_item_id   uuid        not null references plaid_items(id) on delete cascade,
  account_id      text        not null,
  name            text,
  iban            text,
  currency        text        default 'EUR',
  last_synced_at  timestamptz,
  unique (plaid_item_id, account_id)
);

alter table bank_accounts enable row level security;

-- No SELECT/INSERT/UPDATE/DELETE policies → service-role only.
-- (RLS on + no policies = total client lockdown, server bypasses via secret key.)

-- 2) Lock down plaid_items: drop the client-readable policy.
-- access_token holds Enable Banking session metadata; must never leak to the browser.
drop policy if exists "users_own_plaid_items" on plaid_items;
-- RLS still on; no policies = no client access.

-- 3) Tighten transactions: clients read their own, server writes via service key.
drop policy if exists "users_own_transactions" on transactions;
drop policy if exists "transactions_select_own" on transactions;
create policy "transactions_select_own"
  on transactions for select
  using (auth.uid() = user_id);

-- Optional sanity check (commented out to keep migration silent):
-- select tablename, policyname from pg_policies
--   where schemaname = 'public' and tablename in ('plaid_items','bank_accounts','transactions');

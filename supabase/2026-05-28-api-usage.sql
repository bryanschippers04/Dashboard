-- ============================================================
-- API usage / cost tracking. Every paid API call gets one row.
-- Today the only paid API in this dashboard is the Anthropic
-- (Claude) API used by the insights pipeline.
-- 2026-05-28
-- ============================================================

create table if not exists public.api_usage (
  id              uuid          primary key default gen_random_uuid(),
  user_id         uuid          not null references auth.users(id) on delete cascade,
  provider        text          not null default 'anthropic',
  model           text          not null,
  endpoint        text          not null,
  input_tokens    integer       not null default 0,
  output_tokens   integer       not null default 0,
  cost_usd        numeric(14,8) not null default 0,
  created_at      timestamptz   not null default now()
);

alter table public.api_usage enable row level security;
-- No client policies → service-role only. The dashboard reads costs
-- via a server route (/api/usage) using the admin client.

create index if not exists idx_api_usage_user_time
  on public.api_usage (user_id, created_at desc);

-- ============================================================
-- Sanity check:
--   select count(*) from public.api_usage;
-- Should return 0 on a fresh install.
-- ============================================================

-- ============================================================
-- API rate limit counters. One row per (user_id, bucket, window).
-- The app calls hitRateLimit() before any paid endpoint; that
-- function inserts/increments the row for the current rolling
-- window, then 429s if the count exceeds the configured cap.
-- 2026-05-29
-- ============================================================

create table if not exists public.api_rate_limits (
  user_id      uuid        not null references auth.users(id) on delete cascade,
  bucket       text        not null,       -- e.g. 'assistant', 'insights_weekly', 'insights_daily', 'journal'
  window_start timestamptz not null,       -- truncated to bucket window
  count        integer     not null default 0,
  primary key (user_id, bucket, window_start)
);

alter table public.api_rate_limits enable row level security;
-- Service-role only; the helper always uses the admin client.

-- Old window rows are dead weight. The helper periodically prunes,
-- but an index on (user_id, bucket) keeps lookups fast even before
-- a prune runs.
create index if not exists idx_api_rate_limits_lookup
  on public.api_rate_limits (user_id, bucket, window_start desc);

-- ============================================================
-- Sanity check:
--   select count(*) from public.api_rate_limits;
-- Should return 0 on a fresh install.
-- ============================================================

-- ============================================================
-- Google Calendar integration.
-- - calendar_tokens: one row per user; stores OAuth access/refresh
--   tokens so the server can re-pull events without re-prompting.
-- - calendar_events: cached event copies pulled from Google.
--   Read by the insights pipeline so Claude can correlate mood ×
--   spending × schedule.
-- 2026-05-28
-- ============================================================

create table if not exists public.calendar_tokens (
  user_id        uuid        primary key references auth.users(id) on delete cascade,
  access_token   text        not null,
  refresh_token  text,
  expires_at     timestamptz not null,
  scope          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.calendar_tokens enable row level security;
-- Service-role only. Never exposed to the browser.

create table if not exists public.calendar_events (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  google_event_id text        not null,
  calendar_id     text        not null default 'primary',
  summary         text,
  description     text,
  start_at        timestamptz,
  end_at          timestamptz,
  all_day         boolean     not null default false,
  location        text,
  status          text,
  synced_at       timestamptz not null default now(),
  unique (user_id, google_event_id)
);

alter table public.calendar_events enable row level security;
-- Client SELECT only (so the /calendar page can render without going
-- through the admin client); writes are service-role only via /api/calendar/*.
drop policy if exists "users read own calendar events" on public.calendar_events;
create policy "users read own calendar events"
  on public.calendar_events for select
  using (auth.uid() = user_id);

create index if not exists idx_calendar_events_user_time
  on public.calendar_events (user_id, start_at desc);

-- ============================================================
-- Sanity check:
--   select count(*) from public.calendar_tokens;
--   select count(*) from public.calendar_events;
-- Both should return 0 on a fresh install.
-- ============================================================

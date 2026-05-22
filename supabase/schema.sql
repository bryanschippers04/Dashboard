-- Personal OS Dashboard — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query

-- =========================================================
-- MILESTONE 1: Auth + Journal
-- =========================================================

create table if not exists journal_entries (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  text       text        not null,
  timestamp  timestamptz not null default now(),
  rating     smallint    check (rating >= 0 and rating <= 10),
  mood_tags  text[],
  language   text        not null default 'en',
  audio_url  text
);

alter table journal_entries enable row level security;

create policy "users_own_journal" on journal_entries
  for all using (auth.uid() = user_id);

-- =========================================================
-- MILESTONE 2: Todos + Goals
-- =========================================================

create table if not exists todos (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  title      text        not null,
  completed  boolean     not null default false,
  due_date   date
);

alter table todos enable row level security;

create policy "users_own_todos" on todos
  for all using (auth.uid() = user_id);

create table if not exists goals (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  title            text        not null,
  type             text        not null check (type in ('daily', 'weekly', 'monthly')),
  target           numeric     not null,
  current_progress numeric     not null default 0
);

alter table goals enable row level security;

create policy "users_own_goals" on goals
  for all using (auth.uid() = user_id);

-- =========================================================
-- MILESTONE 4–6: Finance, Screen Time, Insights
-- =========================================================

create table if not exists transactions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  amount     numeric     not null,
  category   text,
  merchant   text,
  date       date,
  plaid_id   text unique
);

alter table transactions enable row level security;

create policy "users_own_transactions" on transactions
  for all using (auth.uid() = user_id);

create table if not exists insights (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  content      text        not null,
  insight_type text        not null,
  generated_at timestamptz not null default now()
);

alter table insights enable row level security;

create policy "users_own_insights" on insights
  for all using (auth.uid() = user_id);

create table if not exists screen_time (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  duration_minutes integer     not null,
  app_name         text        not null,
  date             date        not null
);

alter table screen_time enable row level security;

create policy "users_own_screen_time" on screen_time
  for all using (auth.uid() = user_id);

create table if not exists plaid_items (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  access_token     text        not null,
  item_id          text        not null unique,
  institution_name text
);

alter table plaid_items enable row level security;

create policy "users_own_plaid_items" on plaid_items
  for all using (auth.uid() = user_id);

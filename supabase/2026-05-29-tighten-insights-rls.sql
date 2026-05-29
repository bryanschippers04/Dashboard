-- ============================================================
-- Tighten insights RLS to client SELECT-only.
-- CLAUDE.md already documented this as the intended policy; the
-- original schema.sql created a FOR ALL policy by mistake. No
-- client code writes to insights via the supabase JS client
-- (writes go through /api/insights/* using the service role +
-- user_id filter), so this is a no-op for the app and tightens
-- the actual policy to match the intent.
-- 2026-05-29
-- ============================================================

drop policy if exists "users_own_insights"      on public.insights;
drop policy if exists "insights_select_own"     on public.insights;

create policy "insights_select_own"
  on public.insights for select
  using (auth.uid() = user_id);

-- Sanity check (run after):
--   select policyname, cmd from pg_policies
--   where schemaname='public' and tablename='insights';
-- Expect a single row: insights_select_own, SELECT.

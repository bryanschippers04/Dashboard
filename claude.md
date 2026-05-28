\# Claude.md \- Dashboard Project

\#\# Project Overview  
Personal Life/Business Dashboard \- all-in-one app for journaling, finances, goals, and AI insights.

Stack: Next.js (App Router) \+ Supabase \+ Claude API \+ Enable Banking  
Hosting: Vercel  
Repo: github.com/bryanschippers04/Dashboard  
Live: dashboard-beryl-five-45.vercel.app  
Timeline: 1 week MVP  
Goal: Functional, not beautiful

\---

\#\# Status (2026-05-28)

Built and shipped on Vercel:
\- Day 1: Next.js scaffold \+ Supabase \+ email/password auth ✅  
\- Day 2: Voice journal (Dutch by default, Web Speech API) ✅  
\- Day 3: Todos \+ Goals (full CRUD, home cards) ✅  
\- Day 4: Finance \- Enable Banking integration (Rabobank), manual accounts (savings), Vaste Lasten recurring panel (auto-detect \+ manual) ✅  
\- Day 7: Claude insights — weekly (auto via Sunday 22:00 UTC cron \+ manual button) \+ daily on demand \+ starred library \+ per-week distillations as long-term memory ✅

Not built yet:
\- Day 5: Gmail \+ Google Calendar  
\- Day 6: Screen time tracking

\---

\#\# Database Tables (Supabase)

All RLS enabled. Service-role-only tables have no client policies; the server uses \`src/lib/supabase/admin.ts\`.

1\. \`journal\_entries\` \- id, user\_id, text (raw transcript, kept as full-fidelity backup), text\_compact (newline-separated 2–5 hyper-compact bullets produced by Claude on submit), timestamp, rating (0-10), mood\_tags\[\], language, audio\_url, sleep\_minutes (0–1440, opt-in), energy (0–10), productivity (0–10), exercise (free text), time\_outside ('none'/'<30m'/'30-60m'/'1h+'), phone\_time\_minutes (0–1440, end-of-day manual entry). The quick-input fields feed daily + weekly Claude payloads so the AI can correlate mood × spending × sleep × screen time × movement.  
2\. \`todos\` \- id, user\_id, title, completed, due\_date  
3\. \`goals\` \- id, user\_id, title, type (daily/weekly/monthly), target, current\_progress  
4\. \`transactions\` \- id, user\_id, amount, category, merchant, date, plaid\_id (unique \- treated as opaque provider transaction id), booked\_at, created\_at, counterparty\_iban, provider\_sequence. **RLS: client SELECT-only, server writes via service role.**  
5\. \`plaid\_items\` \- id, user\_id, access\_token, item\_id, institution\_name. Table name retained from the initial scaffold; now stores Enable Banking session metadata (item\_id \= session\_id, access\_token \= JSON of session info). **RLS: service-role only (no client policies).**  
6\. \`bank\_accounts\` \- id, user\_id, plaid\_item\_id (FK), account\_id, name, iban, currency, last\_synced\_at. One row per linked bank account under a consent. **RLS: service-role only.**  
7\. \`manual\_accounts\` \- id, user\_id, name, iban, balance (anchor), currency, balance\_set\_at, updated\_at. For savings / cash buckets not linked via API. Displayed balance is derived: anchor \+ sum of matching transfers since balance\_set\_at. **RLS: service-role only.**  
8\. \`recurring\_expenses\` \- id, user\_id, name, amount, currency, frequency (weekly/monthly/quarterly/yearly), source, active. Manual entries for Vaste Lasten panel; auto-detected items are computed at read time. **RLS: service-role only.**  
9\. \`insights\` \- id, user\_id, insight\_type (pattern/action/win/warning), title, body, content (legacy), verse (jsonb), scope (weekly/daily), week\_start (date, weekly only), day (date, daily only), is\_starred (bool), generated\_at. **RLS: client SELECT-only (writes via service role).** Starred rows are pinned into every future Claude run as canonical memory.  
10\. \`insight\_summaries\` \- id, user\_id, week\_start, summary, created\_at. One row per week — a ~2-sentence broken-English distillation of that week's insights, auto-generated alongside each weekly run. Fed into all future runs as long-term memory. Unique on (user\_id, week\_start). **RLS: service-role only.**  
11\. \`api\_usage\` \- id, user\_id, provider, model, endpoint, input\_tokens, output\_tokens, cost\_usd (numeric(14,8)), created\_at. One row per paid API call (today only Anthropic). Cost is computed at insert time using \`src/lib/pricing.ts\`. **RLS: service-role only.**  
12\. \`journal\_drafts\` \- user\_id (PK), text, rating, mood\_tags\[\], language, sleep\_minutes, energy, productivity, exercise, time\_outside, phone\_time\_minutes, updated\_at. Mirrors the journal\_entries quick-input fields so partial day-state survives across devices. One rolling draft per user, written directly from the browser via RLS policy ("users manage own draft"). Auto-upserted by \`JournalForm\` ~1.5s after typing pauses; deleted on successful submit or via the DISCARD button. **RLS: client read/write own row.**  
13\. \`screen\_time\` \- id, user\_id, duration\_minutes, app\_name, date. Not yet used (Day 6).

Note: there is no \`public.users\` table. Foreign keys point at \`auth.users\` directly.

\---

\#\# API Endpoints

Journal: POST/GET/DELETE /api/journal — POST runs the raw text through Claude (\`compactJournal\`) and stores both text \+ text\_compact, plus an api\_usage row.  
Todos: POST/GET/PATCH/DELETE /api/todos  
Goals: POST/GET/PATCH/DELETE /api/goals  
Finance \- connect: POST /api/finance/connect (starts Enable Banking authorisation)  
Finance \- callback: GET /api/finance/callback (handles redirect from bank consent)  
Finance \- sync: POST /api/finance/sync (pulls last 90d transactions per linked account)  
Finance \- manual accounts: GET/POST/PATCH/DELETE /api/finance/manual-accounts  
Finance \- recurring: GET/POST/PATCH/DELETE /api/finance/recurring  
Insights \- weekly run (manual): POST /api/insights/run  
Insights \- daily run (manual): POST /api/insights/daily  
Insights \- cron (Vercel-only): GET/POST /api/insights/cron (Bearer-auth via CRON\_SECRET; reads owner from INSIGHTS\_OWNER\_USER\_ID)  
Insights \- per-row: PATCH/DELETE /api/insights/\[id\] (PATCH body \`{ is\_starred: boolean }\`)  
Usage: GET /api/usage (totals + per-endpoint breakdown, used by the gear-icon dropdown in TopNav)  
Gmail: not yet built  
Calendar: not yet built

\---

\#\# Environment Variables

NEXT\_PUBLIC\_SUPABASE\_URL  
NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY  
SUPABASE\_SECRET\_KEY (renamed from SUPABASE\_SERVICE\_ROLE\_KEY when migrating to the new Supabase key system)  
ANTHROPIC\_API\_KEY  
CRON\_SECRET (random 32+ char string; Vercel adds \`Authorization: Bearer\` on cron requests, the cron route checks this)  
INSIGHTS\_OWNER\_USER\_ID (this user's UUID from auth.users; the cron has no session, so it picks the owner via env)  
ENABLE\_BANKING\_APP\_ID  
ENABLE\_BANKING\_PRIVATE\_KEY (full multi-line PEM; in Vercel paste raw, in .env.local wrap in double quotes)  
GMAIL\_CLIENT\_ID (later)  
GMAIL\_CLIENT\_SECRET (later)  
GOOGLE\_CALENDAR\_API\_KEY (later)

\---

\#\# Pages (built)

\- /            home dashboard (Operator, Session, Journal, Today, Goals, Finance Pulse cards)  
\- /login       email/password sign-in / sign-up  
\- /journal     voice journal entries  
\- /todos       to-do CRUD \+ progress  
\- /goals       three sections (daily/weekly/monthly) with \+/− quick increment  
\- /finance     transactions, week/month spend tiles, 14-day bar chart, category breakdown (7d/30d/6mo/1y/all switcher), manual accounts, vaste lasten panel  
\- /insights    starred library at top, weekly groups below with per-week distillation and daily insights interleaved; manual generate buttons for daily \+ weekly  
\- /privacy     boilerplate for Enable Banking compliance  
\- /terms       same

\---

\#\# Claude Integration (Day 7 — wired)

Lib layout under \`src/lib/\`:
\- \`weeklyInsightsPrompt.ts\` / \`dailyInsightsPrompt.ts\` — system prompts
\- \`aggregateWeek.ts\` / \`aggregateDay.ts\` — payload builders, share a \`buildMemory()\` helper for the memory block
\- \`runWeeklyInsights.ts\` / \`runDailyInsights.ts\` — pure orchestrators (aggregate → Claude → validate)
\- \`claudeClient.ts\` — Anthropic API wrapper, defaults to \`claude-sonnet-4-6\`
\- \`insightsServer.ts\` — server-only DB-gathering \+ insert logic; the helpers \`runAndStoreWeekly(userId)\` / \`runAndStoreDaily(userId)\` are called by every API route
\- \`dateRange.ts\` — \`getLastWeekRange\`, \`getYesterdayRange\`

Weekly Claude call returns \`{ insights, distillation }\`. Insights go into \`public.insights\` (\`scope='weekly'\`, \`week_start\` set). The distillation goes into \`public.insight_summaries\` (one row per week, upsert). Daily Claude call returns just an array of insights — \`scope='daily'\`, \`day\` set, no verse.

Memory layers fed into every run, all pulled in \`getInsightsMemory()\`:
1. all starred insights (no limit)
2. all weekly distillations (no limit)
3. last 15 unstarred insights for short-term context

\---

\#\# Key Decisions

\- Web app (not mobile native) \- Faster, responsive  
\- Supabase (not Firebase) \- Better structured data  
\- Enable Banking (not Plaid, not GoCardless, not direct Rabobank API) \- Plaid charges in EU and free trial is US/Canada only. GoCardless Bank Account Data disabled new signups in July 2025. Direct Rabobank PSD2 API requires AISP licensing. Enable Banking is open for solo dev personal-use signups, covers Rabobank, RS256 JWT auth.  
\- Web Speech API (not Whisper) \- Free, works for Dutch  
\- Claude (not GPT-4) \- Better pattern reasoning  
\- Vercel (not self-hosted) \- Free tier  
\- Multi-account from day one in the bank-link code path \- linking a second bank later (Revolut, etc.) requires no code change.  
\- Manual-account balances are *derived*, not stored \- the \`balance\` field is the anchor the user last set; the displayed value is anchor \+ matching transfers since \`balance\_set\_at\`. Avoids double-application headaches on re-sync.

\---

\#\# Next Phases

Phase 2: UI polish (colors, hover effects, micro-animations), desktop screen time, charts, PDF exports  
Phase 3: Mobile app, dark/light variants, habit streaks, recurring next-due-date prediction

\---

\#\# Important

\- One user only  
\- Functionality first  
\- Free tier services only  
\- Use Git  
\- Privacy: user's Supabase only  
\- All schema changes go through dated migration files in \`supabase/\` and are applied manually via Supabase SQL Editor. No automated migration runner.

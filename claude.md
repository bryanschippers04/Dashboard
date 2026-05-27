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

Not built yet:
\- Day 5: Gmail \+ Google Calendar  
\- Day 6: Screen time tracking  
\- Day 7: Claude weekly insights (lib scaffolding is committed under \`src/lib/\`)

\---

\#\# Database Tables (Supabase)

All RLS enabled. Service-role-only tables have no client policies; the server uses \`src/lib/supabase/admin.ts\`.

1\. \`journal\_entries\` \- id, user\_id, text, timestamp, rating (0-10), mood\_tags\[\], language, audio\_url  
2\. \`todos\` \- id, user\_id, title, completed, due\_date  
3\. \`goals\` \- id, user\_id, title, type (daily/weekly/monthly), target, current\_progress  
4\. \`transactions\` \- id, user\_id, amount, category, merchant, date, plaid\_id (unique \- treated as opaque provider transaction id), booked\_at, created\_at, counterparty\_iban, provider\_sequence. **RLS: client SELECT-only, server writes via service role.**  
5\. \`plaid\_items\` \- id, user\_id, access\_token, item\_id, institution\_name. Table name retained from the initial scaffold; now stores Enable Banking session metadata (item\_id \= session\_id, access\_token \= JSON of session info). **RLS: service-role only (no client policies).**  
6\. \`bank\_accounts\` \- id, user\_id, plaid\_item\_id (FK), account\_id, name, iban, currency, last\_synced\_at. One row per linked bank account under a consent. **RLS: service-role only.**  
7\. \`manual\_accounts\` \- id, user\_id, name, iban, balance (anchor), currency, balance\_set\_at, updated\_at. For savings / cash buckets not linked via API. Displayed balance is derived: anchor \+ sum of matching transfers since balance\_set\_at. **RLS: service-role only.**  
8\. \`recurring\_expenses\` \- id, user\_id, name, amount, currency, frequency (weekly/monthly/quarterly/yearly), source, active. Manual entries for Vaste Lasten panel; auto-detected items are computed at read time. **RLS: service-role only.**  
9\. \`insights\` \- id, user\_id, content, insight\_type, generated\_at. Not yet used (Day 7).  
10\. \`screen\_time\` \- id, user\_id, duration\_minutes, app\_name, date. Not yet used (Day 6).

Note: there is no \`public.users\` table. Foreign keys point at \`auth.users\` directly.

\---

\#\# API Endpoints

Journal: POST/GET/DELETE /api/journal  
Todos: POST/GET/PATCH/DELETE /api/todos  
Goals: POST/GET/PATCH/DELETE /api/goals  
Finance \- connect: POST /api/finance/connect (starts Enable Banking authorisation)  
Finance \- callback: GET /api/finance/callback (handles redirect from bank consent)  
Finance \- sync: POST /api/finance/sync (pulls last 90d transactions per linked account)  
Finance \- manual accounts: GET/POST/PATCH/DELETE /api/finance/manual-accounts  
Finance \- recurring: GET/POST/PATCH/DELETE /api/finance/recurring  
Gmail: not yet built  
Calendar: not yet built  
Insights: not yet built

\---

\#\# Environment Variables

NEXT\_PUBLIC\_SUPABASE\_URL  
NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY  
SUPABASE\_SECRET\_KEY (renamed from SUPABASE\_SERVICE\_ROLE\_KEY when migrating to the new Supabase key system)  
ANTHROPIC\_API\_KEY  
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
\- /privacy     boilerplate for Enable Banking compliance  
\- /terms       same

\---

\#\# Claude Integration (Day 7 \- not yet wired)

Lib scaffolding under \`src/lib/\`: \`aggregateWeek.ts\`, \`claudeClient.ts\`, \`copy.ts\`, \`dateRange.ts\`, \`moodTags.ts\`, \`runWeeklyInsights.ts\`, \`weeklyInsightsPrompt.ts\`. Design specs under \`docs/superpowers/specs/\`.

Plan: weekly job aggregates journal entries \+ transactions \+ goal progress, calls Claude, stores results in \`insights\` table, displays on home.

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

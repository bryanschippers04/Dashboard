# Wake-up brief — 2026-05-29 overnight speed + security upgrade

You asked for a full speed and security pass to run while you slept. Here's what shipped, what you need to do, and what I deferred.

## TL;DR — do these three things first

1. **Apply two new Supabase migrations** (SQL Editor → New query → paste → Run):
   - `supabase/2026-05-29-tighten-insights-rls.sql` — tightens `insights` policy to SELECT-only to match CLAUDE.md
   - `supabase/2026-05-29-api-rate-limits.sql` — creates the `api_rate_limits` table the new rate limiter writes to
2. **Pull the latest** on `main` and **redeploy on Vercel** — security headers and rate limits go live with the deploy.
3. **Smoke test the live site** once redeployed: open dashboard, run a daily insight, post a journal entry, hit a few todos / habits. If anything 500s, the rate-limit migration isn't applied yet — the route logs "rate limit upsert failed" but still serves (fail-open).

Pending migrations from the previous session are still pending — see `memory/pending_supabase_migrations.md` for the full ordered list (six total now).

---

## What shipped (5 commits on `main`)

`docs: speed + security upgrade spec` — the brainstorm output, saved at `docs/superpowers/specs/2026-05-29-speed-and-security-upgrade.md`.

`security: defence-in-depth on API routes + OAuth/cron hardening`

- New `src/lib/apiAuth.ts` with `requireUser()` and `safeEqual()`
- `/api/todos` and `/api/goals` PATCH+DELETE now explicitly `getUser()` AND filter by `user_id` (previously relied on RLS only)
- `/api/journal` GET+DELETE same defence-in-depth
- Stricter input validation on todos/goals POST/PATCH (length caps, date parse check, target ceiling, completed boolean type check)
- `/api/insights/cron` constant-time bearer compare (was plain `===` — leaked timing)
- `/api/finance/callback` constant-time cookie state compare
- Google Calendar OAuth: state now binds to a short-lived HttpOnly signed cookie; callback enforces both the user-id prefix AND the nonce. Defeats login-CSRF / account-link attacks even if an attacker can lure you through Google's consent screen.
- Error sanitization: every API 5xx now logs the DB error message server-side and returns a generic string to the client (was leaking column/table names).

`security: rate limiter + HTTP hardening headers`

- New table `api_rate_limits` (migration `supabase/2026-05-29-api-rate-limits.sql`)
- New `src/lib/rateLimit.ts` with `hitRateLimit()` per bucket
- Buckets and defaults: assistant `60/h`, insights_weekly `5/day`, insights_daily `20/day`, journal `100/day`, finance_sync `30/h`, calendar_sync `30/h`
- All overridable via env: `RATE_LIMIT_ASSISTANT="60/3600"` etc.
- 429 responses include `Retry-After` and `X-RateLimit-*` headers
- **Fail-open**: if the counter table write errors (e.g. table doesn't exist yet), the request still serves — logged server-side
- Wired into `/api/assistant`, `/api/insights/run`, `/api/insights/daily`, `/api/journal` POST, `/api/finance/sync`, `/api/calendar/sync`

HTTP headers via `next.config.ts`:
- `Content-Security-Policy` — allows only Anthropic, Google OAuth, Enable Banking, your Supabase host
- `Strict-Transport-Security` with 2-year + preload
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — disables camera/geolocation/FLoC, keeps microphone (for voice journal)
- `X-Frame-Options: DENY`
- `reactStrictMode: true`, `poweredByHeader: false`, `optimizePackageImports: ['lucide-react']`

`chore: lint clean — fix React 19 purity + JSX comment warnings`

- Fixed 9 pre-existing lint errors that were blocking clean CI:
  - `Date.now()` and `Math.random()` in `DashboardPage` RSC — hoisted to module-level helpers (`sevenDaysAgoIso`, `pickRandom`)
  - `Date.now()` in `CategoryBreakdown` `useMemo` — captured `today` once via `useToday()` so re-renders don't drift
  - `// V0` / `{number} //` / `// PRIVACY` etc. — JSX rules flagged the literal `//` as malformed comments; wrapped as `{'//'}`
  - `AssistantCard` greeting/dateStr — replaced setState-in-effect with `useState` lazy init (SSR-safe)
  - `UsageBadge` fetch-on-open — kept canonical pattern with scoped rule disable
  - Removed unused `Category` import from `finance/page.tsx`
  - Renamed unused `_v` to scoped destructure in `runDailyInsights.ts`

End state: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run build` clean.

---

## What I deliberately did NOT do

- **Never applied any SQL migration** — all migrations stay in `supabase/` for you to paste into the SQL Editor.
- **No secret rotation** — Enable Banking PEM, Anthropic key, etc. all untouched.
- **No force-push, no branch deletion, no rebase.**
- **No new paid dependencies.** Added one devDep: `@next/bundle-analyzer`.
- **No optimistic-UI refactor** on todos/goals/habits. Reason: each interaction currently does `setPending → mutation → router.refresh()` which forces a full RSC re-render. Moving to `useOptimistic` would feel smoother but the data flow change risks subtle bugs (rollback on failure, race with stale data) that I'd want you to smoke-test on real interactions before shipping. **Filed to BACKLOG** below.
- **Did not split the finance page transaction fetch** into "default last 1 year, lazy-load on ALL range click." Same reason: risk of inconsistent totals if I get the cutoff wrong. **Filed to BACKLOG.**

---

## What's in BACKLOG (you should review)

I added a `## 2026-05-29 audit findings` section to `BACKLOG.md` (next commit) with:

1. **Optimistic UI on todos/goals/habits.** Today: click → wait for round-trip + RSC re-render before the box re-renders. With `useOptimistic`: instant, reconciled on response. Biggest perceived-smoothness win, moderate risk if rolled out without testing.
2. **Finance page: lazy-load transactions beyond 1 year.** Currently pulls ALL transactions to support the category breakdown's "ALL" toggle. Fine for now (few txs), will become slow at thousands.
3. **CSP host allowlist tuning.** The current CSP includes Anthropic/Google/Enable Banking/Supabase. If anything else fetches at runtime (e.g. a new analytics service) it'll be blocked. Use the browser console's CSP violations report to add hosts.
4. **`postcss < 8.5.10` advisory** (`GHSA-qx2v-qp2m-jg93`) is bundled inside `next@16.2.6`. Triggers only on stringifying untrusted CSS, which Tailwind doesn't do — non-exploitable here. Watch for a next patch release.
5. **`api_rate_limits` window pruning.** Old rows accumulate indefinitely. Add a Supabase cron or a self-prune in `hitRateLimit()` if it grows past ~10k rows.

---

## Verify when you wake

I couldn't smoke-test the live site (needs your Supabase session). Once redeployed:

1. **CSP works** — Open DevTools → Network tab → reload home. No CSP violation errors should appear in the Console. If something specific is blocked, the report tells you the source — add it to `connectSources` in `next.config.ts`.
2. **Rate limit headers present** — `curl -I https://dashboard-beryl-five-45.vercel.app` after deploy should show `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options: DENY`.
3. **Calendar OAuth** — disconnect + reconnect Google Calendar. New nonce-bound flow. If the cookie isn't set (e.g. blocked by extension), you'll see `?error=bad_state` on the calendar page.
4. **Assistant rate-limit** — send 60 quick messages in an hour. The 61st should 429 with `Retry-After`. (You probably won't hit this; it's mostly cost protection if a tab loops.)

If anything breaks, the change with the highest blast radius is the CSP. Revert in `next.config.ts` by commenting out the `Content-Security-Policy` line in `securityHeaders` while you investigate.

---

## Files touched

```
docs/superpowers/specs/2026-05-29-speed-and-security-upgrade.md  (new)
src/lib/apiAuth.ts                                                (new)
src/lib/rateLimit.ts                                              (new)
supabase/2026-05-29-tighten-insights-rls.sql                      (new)
supabase/2026-05-29-api-rate-limits.sql                           (new)
next.config.ts                                                    (rewrote)
src/app/api/{todos,goals,journal}/route.ts                        (defence-in-depth)
src/app/api/insights/cron/route.ts                                (timingSafeEqual)
src/app/api/finance/callback/route.ts                             (timingSafeEqual)
src/app/api/calendar/{connect,callback}/route.ts                  (nonce cookie binding)
src/app/api/{assistant,insights/run,insights/daily,journal,finance/sync,calendar/sync}/route.ts (rate limit + error sanitization)
src/app/api/{finance,habits,insights,preferences,usage}/**/*.ts   (error sanitization)
src/app/page.tsx                                                  (lint purity)
src/app/finance/page.tsx                                          (unused import)
src/app/{privacy,terms}/page.tsx                                  ({'//'})
src/components/{Card,TopNav,AssistantCard,Clock,UsageBadge,CategoryBreakdown}.tsx (lint fixes)
src/lib/runDailyInsights.ts                                       (lint)
package.json + package-lock.json                                  (devDep @next/bundle-analyzer)
```

Sleep was worth it. Want me to wire optimistic UI next?

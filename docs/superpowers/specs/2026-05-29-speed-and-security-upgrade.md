# Speed + Security Upgrade — Personal Dashboard

**Date:** 2026-05-29
**Mode:** autonomous overnight execution
**Scope:** all of `src/`, `supabase/`, `next.config.ts`, `package.json`

## Goals

1. Close every security gap I'm confident about, defence-in-depth on auth/RLS, harden HTTP layer.
2. Make the app perceptibly faster and smoother — bundle, fetch waterfalls, optimistic UI.
3. Leave a clean migration list + verify-when-awake notes; never apply schema changes to Supabase.

## Non-goals

- New features.
- UI redesign / colour pass.
- Touching Enable Banking PEM, rotating secrets, or modifying any `.env`.
- Service worker / PWA shell (deferred to backlog unless trivial).

## Decisions baked in (from brainstorm)

- **Autonomy:** apply all fixes I'm confident in; ambiguous calls → `BACKLOG.md` with notes.
- **Rate limiting:** Supabase-backed counter via new `api_rate_limits` table.
- **Bundle analyzer:** add `@next/bundle-analyzer` as devDep.
- **Default rate limits:** assistant 60/h, weekly insights 5/day, daily insights 20/day, journal POST 100/day. Configurable via env.

## Workstreams

### S — Security

| ID | Check | Fix if found |
|----|-------|--------------|
| S1 | Every `/api/**` route calls `getUser()` and 401s | Add guard + `.eq('user_id', user.id)` on writes |
| S2 | RLS policies match CLAUDE.md claims (pull via MCP) | New dated migration if drift |
| S3 | `journal_drafts` policy scopes to `auth.uid()` | Migration if not |
| S4 | CRON route uses constant-time bearer compare | Replace `===` with `timingSafeEqual` |
| S5 | No `NEXT_PUBLIC_` exposure of secrets | Grep + rename if found |
| S6 | No hardcoded keys/IBANs in source | Remove + flag |
| S7 | `createAdminClient` only imported server-side | Grep, refactor if leaked |
| S8 | Enable Banking `eb_auth_state` cookie HttpOnly+Secure+SameSite, constant-time compare | Add flags |
| S9 | Google Calendar OAuth state includes signed nonce | Add nonce cookie |
| S10 | No open-redirects via user-controlled `next=` params | Allowlist if any |
| S11 | API request bodies validated (types + length caps) | Inline validators |
| S12 | Numeric ranges enforced server-side (rating, sleep, energy, etc.) | Add bounds checks |
| S13 | Date fields parsed/validated before insert | Add checks |
| S14 | Rate limits on Claude endpoints | Implement `withRateLimit()` helper + `api_rate_limits` table |
| S15 | Assistant tool-loop has hard iteration cap | Verify + cap to 10 if missing |
| S16 | Security headers (CSP, HSTS, X-CTO, Referrer, Permissions, XFO) | Add via `next.config.ts` `headers()` |
| S17 | Cookie flags Secure+HttpOnly+SameSite in prod | Confirm Supabase SSR defaults |
| S18 | `npm audit --omit=dev` clean | Patch deps |
| S19 | No secrets/PII in `console.log/error` | Sanitize |
| S20 | 5xx responses return generic message, log full server-side | Replace `error.message` returns |

### P — Performance / Smoothness

| ID | Check | Fix if found |
|----|-------|--------------|
| P1 | Bundle analyzer run, heaviest chunks identified | Targeted splits, dynamic imports |
| P2 | Client components with no client-only code | Convert to RSC |
| P3 | `lucide-react` tree-shakes | Confirm named imports only |
| P4 | Finance charts dynamic-imported with `ssr: false` | `next/dynamic` |
| P5 | Home page parallel-fetches on server, not in cards | Move to RSC, `Promise.all` |
| P6 | Suspense boundaries per home card for streaming | Add `<Suspense>` |
| P7 | DB indexes on hot filter columns | New migration |
| P8 | N+1 in habits home card | Joined query |
| P9 | `select('*')` on hot paths | Narrow to needed columns |
| P10 | Images via `next/image` | Replace `<img>` if any |
| P11 | Fonts via `next/font` swap+subset | Convert if not |
| P12 | Optimistic UI on todo toggle / habit tick / goal +/− | `useOptimistic` |
| P13 | Loading skeletons replace empty space | Per card |
| P14 | `next.config.ts` enables `optimizePackageImports`, disables `poweredByHeader` | Update config |
| P15 | TypeScript clean (`tsc --noEmit`) | Fix blockers |
| P16 | `npm run lint` clean | Fix or document |

### Process

| ID | Step |
|----|------|
| X1 | `git status` clean check before starting; stash if needed |
| X2 | One commit per logical chunk on `main` |
| X3 | SQL migrations land in `supabase/2026-05-29-*.sql`, NOT applied — appended to `memory/pending_supabase_migrations.md` |
| X4 | `npm run build && npm run lint && npx tsc --noEmit` clean before each major commit |
| X5 | Dev server + Playwright smoke: login page, security headers via curl, home page hydrate without console errors |
| X6 | Ambiguous items → `BACKLOG.md` with a `## 2026-05-29 audit findings` section |
| X7 | Final summary: `WAKE-UP.md` at repo root listing what shipped, migrations to apply, anything needing manual verification |

## Out-of-scope / deferred (going to BACKLOG)

- Mobile-native shell, dark/light variants — Phase 3 already.
- Replacing Supabase SSR cookies with a custom auth layer.
- Full e2e test suite.
- CSP host allowlist tuning beyond a sensible default (will add `report-only` if hosts uncertain).

## Acceptance

- `npm run build` succeeds.
- `npm run lint` clean (or any new warnings explicitly noted in `WAKE-UP.md`).
- `npx tsc --noEmit` clean.
- `npm audit --omit=dev` shows no high/critical (or noted in `WAKE-UP.md` with rationale).
- Every API route reachable by user input has explicit `getUser()` + 401.
- All Claude endpoints have rate limits applied.
- Security headers present on at least the home page (verified via curl).
- Migrations listed in `memory/pending_supabase_migrations.md`.

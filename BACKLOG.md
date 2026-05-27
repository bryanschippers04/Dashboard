# Backlog

Deferred items — not blocking MVP, revisit later.

## Voice journal

- **Live transcription** — current implementation only shows text after `stop`. Web Speech API supports `interimResults = true` for word-by-word output. Trade-off: more flicker, partial-result handling. Revisit if the record-then-wait UX feels slow during real use. _(2026-05-22)_
- **Language toggle (EN/NL)** — `recognition.lang` is hardcoded to `'nl-NL'`. Add a per-recording toggle in the form header if journaling in English becomes a regular need. _(2026-05-22)_

## Finance — Enable Banking

- **Link Revolut** — Enable Banking supports it; the multi-account code path is ready. Activate via Enable Banking dashboard "Activate by linking accounts." Auto-detected subs in Vaste Lasten will populate after the next sync, no code changes needed. _(2026-05-28)_
- **Account balances tile** — Enable Banking exposes `/accounts/{id}/balances`. Currently we only sync transactions; net worth uses manual-account balances only. Wire `getAccountBalances()` into sync, store on `bank_accounts` (new `current_balance` column), include in net-worth math. _(2026-05-27)_
- **Re-consent reminder banner** — PSD2 consent expires every 180 days. Show a banner on `/finance` when the latest sync returns a 401-style error from Enable Banking. Trigger re-auth. _(2026-05-27)_
- **Transaction pagination** — `/finance` shows last 30 days hardcoded for the transactions list. Add a "Load older" or pagination once data accrues past one month. _(2026-05-28)_
- **Vercel cron for nightly sync** — currently manual `Sync now` button. Vercel cron + a private endpoint can run nightly. _(2026-05-27)_
- **Account deletion / disconnect UI** — currently a manual `delete from bank_accounts` in Supabase. Add a "Disconnect" button per linked account. _(2026-05-27)_
- **Multi-currency** — assume EUR everywhere. Add per-currency balances + FX rates when needed (own its own feature sizing). _(2026-05-27)_
- **Retroactive recompute for manual accounts** — when user creates a `manual_accounts` row later, prior transfers to it don't retroactively apply. Workaround: user enters their actual current balance as the anchor. A "Recompute from history" button would be nicer. _(2026-05-28)_
- **Counterparty IBAN match via remittance text** — for now `counterparty_iban` is whatever Enable Banking gives us in `creditor_account.iban` / `debtor_account.iban`. Sometimes IBANs appear only in `remittance_information`; parse those for stronger matching. _(2026-05-28)_

## Finance — Vaste Lasten panel

- **Next-due-date prediction** — show "Next: 14 Jun" for monthly subs. Use the average gap to project the next charge from `lastSeen`. _(2026-05-28)_
- **Yearly-cost view toggle** — header currently shows monthly-normalised total. Add a /MO ↔ /YR toggle. Cosmetic. _(2026-05-28)_
- **Cancellation reminders / alerts** — for a yearly sub, alert N days before renewal. Out of scope of MVP. _(2026-05-28)_
- **Merge duplicate detected vs manual entries** — if a sub gets manually added AND later auto-detected (once Revolut is linked), we'd show two rows. Dedup by normalised merchant. _(2026-05-28)_
- **Smarter Claude-based categorization** — keyword categorizer in `src/lib/categorize.ts` is sufficient for MVP. Revisit if the `other` category becomes a large share of monthly spend. _(2026-05-27)_

## UI polish (whole app)

Deliberately deferred to the end of the MVP per the "polish later" decision. Items to revisit in one dedicated session:

- **Color refinements** — current navy + cyan is OK but not refined. Reconsider once all features are in place. _(2026-05-28)_
- **Hover effects / floating blocks / micro-animations** — make cards feel alive on hover. _(2026-05-28)_
- **Empty states everywhere** — most are functional but plain. _(2026-05-28)_
- **Mobile responsiveness audit** — desktop-first now, untested on phone. _(2026-05-28)_
- **Light-mode variant** — single dark theme today. _(2026-05-28)_

## Security / housekeeping

- **Rotate Anthropic API key** — original `sk-ant-...` key was pasted in chat early in the project. Rotated once; if any concern remains, rotate again. _(2026-05-27)_
- **Rotate Enable Banking private key** — the first sandbox `.pem` was exposed in chat. Production key is currently in use; regenerate if concerned. _(2026-05-27)_
- **Consolidate migrations** — once the schema stabilises, a single `current-schema.sql` baseline file could replace the dated migrations (or sit alongside them as a "fresh setup" shortcut). _(2026-05-28)_

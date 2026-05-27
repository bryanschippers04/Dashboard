# Mood Tags Vocabulary

**Date:** 2026-05-23
**Status:** Approved
**Used in:** `journal_entries.mood_tags` (Supabase)
**Code:** `src/lib/moodTags.ts`

## Design Rules

- Fixed list. No freeform tags.
- Multi-select per entry (typical: 2–4 tags).
- Tight on purpose — too many tags means no tag appears often enough
  to correlate with anything in the weekly insights engine.
- Two groups: **feeling** (what the day felt like) and **context**
  (what kind of day it was). UI can render them as two rows.

## Tags

### Feeling (pick 1–2)

| Tag | Slug |
|---|---|
| Energized | `energized` |
| Tired | `tired` |
| Calm | `calm` |
| Anxious | `anxious` |
| Down | `down` |
| Happy | `happy` |
| Frustrated | `frustrated` |
| Grateful | `grateful` |
| Brain fog | `brain_fog` |

### Context (pick 0–2)

| Tag | Slug |
|---|---|
| Focused | `focused` |
| Scattered | `scattered` |
| Connected | `connected` |
| Alone | `alone` |

**Total: 13 tags.**

## Rationale

- Feelings span the affect spectrum without heavy overlap.
- Context tags are the ones most likely to correlate with spending
  and phone time — the whole point of the insights engine.
- Multi-select captures real days: `tired + frustrated + scattered`
  is exactly the kind of combo Claude should be flagging.
- Fits a single row on phone, no scrolling.

## Deliberately Excluded (for MVP)

- Spiritual tags (`prayerful`, `distant`) — journal text covers it.
- Body tags (`sick`, `hungover`) — too rare to correlate.
- Fine-grained emotions (`disappointed`, `melancholy`) — too sparse.

## Related

- [Weekly Insights Prompt Design](2026-05-22-weekly-insights-prompt-design.md)

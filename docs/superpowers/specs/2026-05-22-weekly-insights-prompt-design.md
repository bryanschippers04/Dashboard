# Weekly Claude Insights Prompt — Design

**Date:** 2026-05-22
**Status:** Draft — Section 1 and 2 approved. Section 3 (worked example) pending.

## Purpose

Generate the weekly Claude API call that powers the dashboard's `insights`
table. Primary job: surface cross-domain patterns Bryan would miss on his
own (spending × mood, phone time × mood, task completion × mood), then
give a small number of concrete actions for the coming week.

## Overall Shape

- **Trigger:** weekly cron (Sunday evening), one Claude API call per user.
- **Inputs to Claude:**
  - Journal entries: full text + rating + mood_tags + date (raw, not summarized)
  - Spending: daily totals + per-category totals (aggregated)
  - Screen time: daily total minutes + top 3 apps by minutes (aggregated)
  - Goals: each goal's target vs. actual for the week
  - Calendar: event titles + dates (light)
  - Last week's insights: full list, each with its type
- **Output:** JSON array of 4–8 insight objects.
- **Storage:** loop the array, insert each into the `insights` table.
- **Voice:** direct, lightly warm. No hype. Treats the user like an adult.
- **Bible verses:** 1–2 insights per week get a verse attached — typically
  mood/struggle/gratitude-related insights, not purely analytical ones.

## Output Schema

```json
[
  {
    "type": "pattern" | "action" | "win" | "warning",
    "title": "short headline, <60 chars",
    "body": "2-4 sentences. Cite specific data.",
    "verse": {
      "ref": "Philippians 4:6-7",
      "text": "Do not be anxious about anything..."
    }
  }
]
```

Types:
- **pattern** — a correlation or trend worth knowing about
- **action** — a specific thing to try next week, tied to a pattern
- **win** — something that went well, worth reinforcing
- **warning** — a trajectory that needs attention now

## System Prompt (v1)

Lives in `src/lib/weeklyInsightsPrompt.ts` as `WEEKLY_INSIGHTS_SYSTEM_PROMPT`.

## Code Layout

- `src/lib/weeklyInsightsPrompt.ts` — the system prompt string
- `src/lib/aggregateWeek.ts` — turns raw rows into the Claude payload
- `src/lib/claudeClient.ts` — fetch wrapper for the Anthropic API
- `src/lib/runWeeklyInsights.ts` — orchestrator: aggregate → call → validate
- `src/lib/dateRange.ts` — "last Mon–Sun" helper

## Schema Additions Needed

The existing `insights` table has `content` only. We need:
- `title` (text, nullable for legacy rows)
- `body` (text, nullable for legacy rows)
- `verse` (jsonb, nullable)
- `week_start` (date, nullable)

Plus indexes on `(user_id, generated_at desc)` and similar for other tables.
See `supabase/2026-05-23-insights-extensions.sql`.

## Open Items (for next session)

- **Section 3:** Build a worked example — sample input payload + expected
  output array. Use to sanity-check the prompt before wiring it up.
- **Model choice:** Sonnet 4.6 likely sufficient; Opus 4.7 if pattern
  reasoning feels shallow in testing.
- **Cron implementation:** Vercel cron route or Supabase Edge Function?
- **Failure handling:** what if Claude returns malformed JSON or zero
  insights? Retry? Fallback message?
- **First-week behavior:** no "last week's insights" exist yet — adjust
  prompt or just send empty array?

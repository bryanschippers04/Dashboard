// Ties everything together: takes a week of raw data, builds the
// payload, calls Claude, and returns a clean array of insight objects
// ready to insert into the `insights` table.
//
// Pure-ish: this function does NOT fetch from Supabase or Google.
// The caller (a cron route) is responsible for gathering data and
// writing the result back to the database.

import { aggregateWeek, type AggregateWeekArgs } from './aggregateWeek'
import { callClaudeJSON } from './claudeClient'
import { WEEKLY_INSIGHTS_SYSTEM_PROMPT } from './weeklyInsightsPrompt'

export type InsightType = 'pattern' | 'action' | 'win' | 'warning'

export interface Insight {
  type: InsightType
  title: string
  body: string
  verse?: { ref: string; text: string }
}

export async function runWeeklyInsights(input: AggregateWeekArgs): Promise<Insight[]> {
  const payload = aggregateWeek(input)
  const userMessage = JSON.stringify(payload, null, 2)

  const insights = await callClaudeJSON<unknown>({
    system: WEEKLY_INSIGHTS_SYSTEM_PROMPT,
    user: userMessage
  })

  return validateInsights(insights)
}

// Makes sure Claude returned the shape we expect. Drops anything weird
// instead of crashing the whole run.
function validateInsights(value: unknown): Insight[] {
  if (!Array.isArray(value)) {
    throw new Error('Expected an array of insights')
  }

  const allowedTypes = new Set<InsightType>(['pattern', 'action', 'win', 'warning'])
  const cleaned: Insight[] = []

  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const i = item as Record<string, unknown>
    if (typeof i.type !== 'string' || !allowedTypes.has(i.type as InsightType)) continue
    if (typeof i.title !== 'string' || !i.title.trim()) continue
    if (typeof i.body !== 'string' || !i.body.trim()) continue

    const out: Insight = {
      type: i.type as InsightType,
      title: i.title.trim(),
      body: i.body.trim()
    }

    if (i.verse && typeof i.verse === 'object') {
      const v = i.verse as Record<string, unknown>
      if (typeof v.ref === 'string' && typeof v.text === 'string') {
        out.verse = { ref: v.ref.trim(), text: v.text.trim() }
      }
    }

    cleaned.push(out)
  }

  return cleaned
}

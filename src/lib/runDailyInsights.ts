// Daily orchestrator: gather → Claude → validate. Returns the cleaned
// array. Caller is responsible for fetching from Supabase and writing
// the results back.

import { aggregateDay, type AggregateDayArgs } from './aggregateDay'
import { callClaudeJSON } from './claudeClient'
import { DAILY_INSIGHTS_SYSTEM_PROMPT } from './dailyInsightsPrompt'
import { validateInsightArray, type Insight } from './runWeeklyInsights'

export async function runDailyInsights(input: AggregateDayArgs): Promise<Insight[]> {
  const payload = aggregateDay(input)
  const userMessage = JSON.stringify(payload, null, 2)

  const raw = await callClaudeJSON<unknown>({
    system: DAILY_INSIGHTS_SYSTEM_PROMPT,
    user: userMessage,
    maxTokens: 1500,
  })

  if (!Array.isArray(raw)) {
    throw new Error('Daily run: expected a JSON array of insights')
  }
  // Daily prompt forbids verses; strip any that slipped through.
  return validateInsightArray(raw).map(({ verse: _v, ...rest }) => rest as Insight)
}

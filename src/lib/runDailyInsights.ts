// Daily orchestrator: gather → Claude → validate. Returns the cleaned
// array. Caller is responsible for fetching from Supabase and writing
// the results back.

import { aggregateDay, type AggregateDayArgs } from './aggregateDay'
import { callClaudeJSON, type ClaudeUsage } from './claudeClient'
import { DAILY_INSIGHTS_SYSTEM_PROMPT } from './dailyInsightsPrompt'
import { modelFor } from './models'
import { validateInsightArray, type Insight } from './runWeeklyInsights'

export interface DailyResult {
  insights: Insight[]
  usage: ClaudeUsage
}

export interface RunDailyOptions {
  modelOverride?: string | null
}

export async function runDailyInsights(
  input: AggregateDayArgs,
  opts: RunDailyOptions = {}
): Promise<DailyResult> {
  const payload = aggregateDay(input)
  const userMessage = JSON.stringify(payload, null, 2)

  const { data, usage } = await callClaudeJSON<unknown>({
    system: DAILY_INSIGHTS_SYSTEM_PROMPT,
    user: userMessage,
    maxTokens: 1500,
    model: modelFor('insights_daily', opts.modelOverride),
  })

  if (!Array.isArray(data)) {
    throw new Error('Daily run: expected a JSON array of insights')
  }
  // Daily prompt forbids verses; strip any that slipped through.
  const insights = validateInsightArray(data).map(
    ({ verse: _v, ...rest }) => rest as Insight
  )
  return { insights, usage }
}

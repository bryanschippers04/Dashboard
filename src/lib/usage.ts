// Centralized usage logging for paid API calls. Today only Anthropic.
// Insert one row per call; the cost is computed from the model's
// pricing table.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ClaudeUsage } from './claudeClient'
import { computeCostUsd } from './pricing'

export async function recordUsage(
  admin: SupabaseClient,
  userId: string,
  endpoint: string,
  usage: ClaudeUsage
): Promise<void> {
  const cost = computeCostUsd(usage.model, usage.input_tokens, usage.output_tokens)
  // Don't fail the caller if usage logging fails; just log.
  const r = await admin.from('api_usage').insert({
    user_id: userId,
    provider: 'anthropic',
    model: usage.model,
    endpoint,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cost_usd: cost,
  })
  if (r.error) console.error('api_usage insert failed:', r.error.message)
}

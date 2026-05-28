// Centralized Claude model selection per task category.
//
// Priority order, highest first:
//   1. User preference (stored in public.user_preferences, fetched
//      per-request by the caller and passed in as `override`)
//   2. Env var override (MODEL_ASSISTANT / MODEL_INSIGHTS_WEEKLY /
//      MODEL_INSIGHTS_DAILY / MODEL_JOURNAL_COMPACT)
//   3. Hardcoded default below
//
// One Anthropic API key works for every Claude model — only the model
// id on each request differs.

import type { SupabaseClient } from '@supabase/supabase-js'

export type ModelCategory =
  | 'assistant'
  | 'insights_weekly'
  | 'insights_daily'
  | 'journal_compact'

const DEFAULTS: Record<ModelCategory, string> = {
  assistant: 'claude-haiku-4-5-20251001',
  insights_weekly: 'claude-sonnet-4-6',
  insights_daily: 'claude-sonnet-4-6',
  journal_compact: 'claude-sonnet-4-6',
}

const ENV_VARS: Record<ModelCategory, string> = {
  assistant: 'MODEL_ASSISTANT',
  insights_weekly: 'MODEL_INSIGHTS_WEEKLY',
  insights_daily: 'MODEL_INSIGHTS_DAILY',
  journal_compact: 'MODEL_JOURNAL_COMPACT',
}

// Allowed values shown in the in-app picker. Env-var / DB can set any
// other valid Claude id (e.g. an Opus variant) — the picker just won't
// surface it but the override still wins.
export const PICKER_OPTIONS = [
  { id: 'claude-haiku-4-5-20251001', label: 'HAIKU' },
  { id: 'claude-sonnet-4-6', label: 'SONNET' },
] as const

export function modelFor(category: ModelCategory, override?: string | null): string {
  if (override && override.trim()) return override.trim()
  const fromEnv = process.env[ENV_VARS[category]]
  if (fromEnv && fromEnv.trim()) return fromEnv.trim()
  return DEFAULTS[category]
}

export interface UserModelOverrides {
  assistant: string | null
  insights_weekly: string | null
  insights_daily: string | null
  journal_compact: string | null
}

export const EMPTY_OVERRIDES: UserModelOverrides = {
  assistant: null,
  insights_weekly: null,
  insights_daily: null,
  journal_compact: null,
}

/**
 * Look up a user's model overrides from public.user_preferences.
 * Returns nulls for any unset category. Safe to call when the table
 * row doesn't exist yet.
 */
export async function getUserModelOverrides(
  admin: SupabaseClient,
  userId: string
): Promise<UserModelOverrides> {
  const { data } = await admin
    .from('user_preferences')
    .select(
      'model_assistant, model_insights_weekly, model_insights_daily, model_journal_compact'
    )
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) return EMPTY_OVERRIDES
  const row = data as {
    model_assistant: string | null
    model_insights_weekly: string | null
    model_insights_daily: string | null
    model_journal_compact: string | null
  }
  return {
    assistant: row.model_assistant ?? null,
    insights_weekly: row.model_insights_weekly ?? null,
    insights_daily: row.model_insights_daily ?? null,
    journal_compact: row.model_journal_compact ?? null,
  }
}

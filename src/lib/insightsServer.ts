// Shared server logic for insights generation. Interactive routes
// (auth-checked) and the cron route (bearer-checked) both call into
// this — they only differ in how they authenticate and pick a user_id.

import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getLastWeekRange,
  getYesterdayRange,
} from '@/lib/dateRange'
import { logicalYesterday } from '@/lib/timezone'
import { runWeeklyInsights } from '@/lib/runWeeklyInsights'
import { runDailyInsights } from '@/lib/runDailyInsights'
import type { MemoryInput } from '@/lib/aggregateWeek'
import { recordUsage } from '@/lib/usage'
import { getEventsInRange } from '@/lib/calendarServer'
import { getHabitsWithProgress } from '@/lib/habitsServer'
import { getUserModelOverrides } from '@/lib/models'

type Admin = SupabaseClient

const RECENT_MEMORY_LIMIT = 15

interface InsightRow {
  insight_type: string
  title: string | null
  body: string | null
  content: string | null
  is_starred: boolean | null
  scope: string | null
  week_start: string | null
  day: string | null
}

interface SummaryRow {
  week_start: string
  summary: string
}

export async function getInsightsMemory(
  admin: Admin,
  userId: string
): Promise<MemoryInput> {
  const [starredRes, distillRes, recentRes] = await Promise.all([
    admin
      .from('insights')
      .select('insight_type, title, body, content, week_start, day, scope')
      .eq('user_id', userId)
      .eq('is_starred', true)
      .order('generated_at', { ascending: false }),
    admin
      .from('insight_summaries')
      .select('week_start, summary')
      .eq('user_id', userId)
      .order('week_start', { ascending: false }),
    admin
      .from('insights')
      .select('insight_type, title, body, content, week_start, day, scope')
      .eq('user_id', userId)
      .eq('is_starred', false)
      .order('generated_at', { ascending: false })
      .limit(RECENT_MEMORY_LIMIT),
  ])

  const starred = (starredRes.data ?? []) as InsightRow[]
  const distillations = (distillRes.data ?? []) as SummaryRow[]
  const recent = (recentRes.data ?? []) as InsightRow[]

  return {
    starred: starred.map(toMemoryInsight),
    distillations: distillations.map((d) => ({
      week_start: d.week_start,
      summary: d.summary,
    })),
    recent: recent.map(toMemoryInsight),
  }
}

function toMemoryInsight(r: InsightRow) {
  return {
    insight_type: r.insight_type,
    title: r.title,
    body: r.body,
    content: r.content,
    week_start: r.week_start,
    day: r.day,
    scope: r.scope,
  }
}

export interface RunWeeklyOutcome {
  inserted: number
  week_start: string
  distillation: string | null
}

export async function runAndStoreWeekly(
  userId: string,
  endpoint: string = '/api/insights/run'
): Promise<RunWeeklyOutcome> {
  const admin = createAdminClient()
  const { start, end } = getLastWeekRange()
  const weekStart = start.toISOString().slice(0, 10)
  const weekEnd = end.toISOString().slice(0, 10)

  const [journalRes, txRes, goalsRes, memory, calendarEvents, prefs, habits] =
    await Promise.all([
      admin
        .from('journal_entries')
        .select(
          'text, timestamp, rating, mood_tags, language, sleep_minutes, energy, productivity, exercise, time_outside, phone_time_minutes'
        )
        .eq('user_id', userId)
        .gte('timestamp', start.toISOString())
        .lte('timestamp', end.toISOString())
        .order('timestamp', { ascending: true }),
      admin
        .from('transactions')
        .select('amount, category, date')
        .eq('user_id', userId)
        .gte('date', weekStart)
        .lte('date', weekEnd),
      admin
        .from('goals')
        .select('title, deadline, target, current_progress')
        .eq('user_id', userId),
      getInsightsMemory(admin, userId),
      getEventsInRange(userId, start, end).catch(() => []),
      getUserModelOverrides(admin, userId),
      getHabitsWithProgress(admin, userId).catch(() => []),
    ])

  const { insights, distillation, usage } = await runWeeklyInsights(
    {
      weekStart: start,
      weekEnd: end,
      journalEntries: journalRes.data ?? [],
      transactions: (txRes.data ?? []) as Array<{
        amount: number
        category: string | null
        date: string
      }>,
      goals: goalsRes.data ?? [],
      calendarEvents,
      habits,
      memory,
    },
    { modelOverride: prefs.insights_weekly }
  )

  // Record usage even if validation rejects everything — the API call
  // happened and was billed.
  await recordUsage(admin, userId, endpoint, usage)

  if (insights.length === 0) {
    throw new Error('Claude returned no usable insights')
  }

  const rows = insights.map((i) => ({
    user_id: userId,
    insight_type: i.type,
    title: i.title,
    body: i.body,
    verse: i.verse ?? null,
    week_start: weekStart,
    scope: 'weekly',
  }))

  const insertRes = await admin.from('insights').insert(rows)
  if (insertRes.error) throw new Error(insertRes.error.message)

  if (distillation) {
    const summaryRes = await admin
      .from('insight_summaries')
      .upsert(
        { user_id: userId, week_start: weekStart, summary: distillation },
        { onConflict: 'user_id,week_start' }
      )
    if (summaryRes.error) throw new Error(summaryRes.error.message)
  }

  return { inserted: insights.length, week_start: weekStart, distillation }
}

export interface RunDailyOutcome {
  inserted: number
  day: string
}

export async function runAndStoreDaily(
  userId: string,
  endpoint: string = '/api/insights/daily'
): Promise<RunDailyOutcome> {
  const admin = createAdminClient()
  const { start, end } = getYesterdayRange()
  // Journal bucketing honors the 4 AM cutoff via entry_date; the
  // surrounding queries (transactions, calendar) keep using the UTC
  // yesterday window — they're not affected by late-night writes.
  const day = logicalYesterday()

  const [journalRes, txRes, goalsRes, memory, calendarEvents, prefs, habits] =
    await Promise.all([
      admin
        .from('journal_entries')
        .select(
          'text, timestamp, rating, mood_tags, language, sleep_minutes, energy, productivity, exercise, time_outside, phone_time_minutes'
        )
        .eq('user_id', userId)
        .eq('entry_date', day)
        .order('timestamp', { ascending: true }),
      admin
        .from('transactions')
        .select('amount, category, merchant, date')
        .eq('user_id', userId)
        .eq('date', day),
      admin
        .from('goals')
        .select('title, deadline, target, current_progress')
        .eq('user_id', userId),
      getInsightsMemory(admin, userId),
      getEventsInRange(userId, start, end).catch(() => []),
      getUserModelOverrides(admin, userId),
      getHabitsWithProgress(admin, userId).catch(() => []),
    ])

  const { insights, usage } = await runDailyInsights(
    {
      day: start,
      journalEntries: journalRes.data ?? [],
      transactions: (txRes.data ?? []) as Array<{
        amount: number
        category: string | null
        merchant: string | null
        date: string
      }>,
      goals: goalsRes.data ?? [],
      calendarEvents,
      habits,
      memory,
    },
    { modelOverride: prefs.insights_daily }
  )

  await recordUsage(admin, userId, endpoint, usage)

  if (insights.length === 0) {
    throw new Error('Claude returned no usable insights')
  }

  const rows = insights.map((i) => ({
    user_id: userId,
    insight_type: i.type,
    title: i.title,
    body: i.body,
    verse: null,
    day,
    scope: 'daily',
  }))

  const insertRes = await admin.from('insights').insert(rows)
  if (insertRes.error) throw new Error(insertRes.error.message)

  return { inserted: insights.length, day }
}

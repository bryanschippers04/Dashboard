// Server-side habit helpers. Shared between /api/habits, the
// insights pipeline, and the assistant tools.

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  currentPeriodKey,
  streakFromCompletions,
  type Cadence,
} from './habits'

export interface HabitRow {
  id: string
  title: string
  cadence: Cadence
  target_count: number
  active: boolean
  sort_order: number
}

export interface HabitWithProgress extends HabitRow {
  current_count: number
  hit_target: boolean
  streak: number
}

/**
 * Returns every active habit for the user with current-period progress
 * and computed streak. One round-trip per table.
 */
export async function getHabitsWithProgress(
  admin: SupabaseClient,
  userId: string
): Promise<HabitWithProgress[]> {
  const [habitsRes, completionsRes] = await Promise.all([
    admin
      .from('habits')
      .select('id, title, cadence, target_count, active, sort_order')
      .eq('user_id', userId)
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    admin
      .from('habit_completions')
      .select('habit_id, period_key')
      .eq('user_id', userId),
  ])
  if (habitsRes.error) throw new Error(habitsRes.error.message)
  if (completionsRes.error) throw new Error(completionsRes.error.message)

  const habits = (habitsRes.data ?? []) as HabitRow[]
  const completions = (completionsRes.data ?? []) as Array<{
    habit_id: string
    period_key: string
  }>

  // Group completions: habit_id -> period_key -> count
  const byHabit = new Map<string, Map<string, number>>()
  for (const c of completions) {
    let inner = byHabit.get(c.habit_id)
    if (!inner) {
      inner = new Map()
      byHabit.set(c.habit_id, inner)
    }
    inner.set(c.period_key, (inner.get(c.period_key) ?? 0) + 1)
  }

  const now = new Date()
  return habits.map((h) => {
    const inner = byHabit.get(h.id) ?? new Map<string, number>()
    const currentKey = currentPeriodKey(h.cadence, now)
    const currentCount = inner.get(currentKey) ?? 0
    const hitTarget = currentCount >= h.target_count
    const streak = streakFromCompletions(h.cadence, h.target_count, inner, now)
    return {
      ...h,
      current_count: currentCount,
      hit_target: hitTarget,
      streak,
    }
  })
}

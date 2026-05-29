// Period-key helpers + streak math for the habit tracker.
// Period key format:
//   daily   : YYYY-MM-DD     (logical day in Europe/Amsterdam, 4 AM cutoff)
//   weekly  : YYYY-Www       (ISO week of the logical day, Mon-start)
//   monthly : YYYY-MM        (month of the logical day)
// The 4 AM cutoff (see src/lib/timezone.ts) means a tick at 02:00 NL
// counts for the previous day / week / month — matches the journal
// entry_date rule so "did I do my habits today" stays consistent
// with how the user thinks about their day.
// Sortable as strings, so the back-walk in streak math is just compare.

import { logicalDateFor } from './timezone'

export type Cadence = 'daily' | 'weekly' | 'monthly'

export function currentPeriodKey(cadence: Cadence, now: Date = new Date()): string {
  const logicalDay = logicalDateFor(now)
  if (cadence === 'daily') return logicalDay
  if (cadence === 'monthly') return logicalDay.slice(0, 7)
  const [y, m, d] = logicalDay.split('-').map(Number)
  return isoWeekKey(new Date(Date.UTC(y, m - 1, d)))
}

export function previousPeriodKey(cadence: Cadence, key: string): string {
  if (cadence === 'daily') {
    // Operate on UTC fields so this is independent of server TZ.
    const d = new Date(key + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() - 1)
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  if (cadence === 'monthly') {
    const [yStr, mStr] = key.split('-')
    let y = Number(yStr)
    let m = Number(mStr) - 1 // 0-indexed
    m -= 1
    if (m < 0) {
      m = 11
      y -= 1
    }
    return `${y}-${String(m + 1).padStart(2, '0')}`
  }
  // weekly
  const m = /^(\d{4})-W(\d{2})$/.exec(key)
  if (!m) return key
  let y = Number(m[1])
  let w = Number(m[2]) - 1
  if (w < 1) {
    y -= 1
    w = isoWeeksInYear(y)
  }
  return `${y}-W${String(w).padStart(2, '0')}`
}

/**
 * Walk backwards from the current period; stop at the first period
 * where `count < targetCount`; return how many contiguous periods met
 * the target. The CURRENT period only counts toward the streak if it
 * already hit target — otherwise we start counting from the previous
 * period (so a streak doesn't visibly drop to 0 just because you
 * haven't done today's habit yet).
 */
export function streakFromCompletions(
  cadence: Cadence,
  targetCount: number,
  completionsByPeriod: Map<string, number>,
  now: Date = new Date()
): number {
  let key = currentPeriodKey(cadence, now)
  const currentCount = completionsByPeriod.get(key) ?? 0
  const target = Math.max(1, targetCount)
  let streak = 0
  if (currentCount >= target) {
    streak = 1
    key = previousPeriodKey(cadence, key)
  } else {
    key = previousPeriodKey(cadence, key)
  }
  // Walk back up to a safety cap so a malformed key can't loop forever.
  for (let i = 0; i < 1000; i++) {
    const c = completionsByPeriod.get(key) ?? 0
    if (c < target) break
    streak += 1
    key = previousPeriodKey(cadence, key)
  }
  return streak
}

// ---- internal date helpers ----

/** ISO week with Mon-start. Operates on UTC fields so it's TZ-agnostic. */
function isoWeekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  // Move to Thursday of the current week (ISO weeks are based on Thursday).
  const dayNum = (t.getUTCDay() + 6) % 7 // Mon=0..Sun=6
  t.setUTCDate(t.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(t.getUTCFullYear(), 0, 4))
  const diff = (t.getTime() - firstThursday.getTime()) / 86400000
  const week = 1 + Math.round((diff - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7)
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function isoWeeksInYear(year: number): number {
  const dec28 = new Date(Date.UTC(year, 11, 28))
  return Number(isoWeekKey(dec28).split('-W')[1])
}

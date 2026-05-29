// User TZ + late-night cutoff for "logical day" calculations.
// Vercel runs Node in UTC; this module is the one place that
// converts to local time + applies the cutoff so server-side
// "what day did this happen on" matches what Bryan thinks.

export const USER_TZ = 'Europe/Amsterdam'

// Anything written before this hour (local time) still counts as
// the previous day. 4 AM is the standard "still up" threshold.
export const LATE_NIGHT_CUTOFF_HOURS = 4

// Returns the logical YYYY-MM-DD for an instant, in USER_TZ,
// honoring the cutoff. Used at journal insert + when asking
// "what's yesterday's logical day".
export function logicalDateFor(
  when: Date = new Date(),
  tz: string = USER_TZ,
  cutoffHours: number = LATE_NIGHT_CUTOFF_HOURS
): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(when)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value)

  const y = get('year')
  const m = get('month')
  const d = get('day')
  // Intl can return '24' for midnight in en-CA hour12:false — normalize.
  const h = get('hour') % 24

  const date = new Date(Date.UTC(y, m - 1, d))
  if (h < cutoffHours) date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

// The logical "yesterday" — what daily insights bucket on when the
// user (or cron) runs them. Subtracts one calendar day from today's
// logical date.
export function logicalYesterday(
  now: Date = new Date(),
  tz: string = USER_TZ
): string {
  const today = logicalDateFor(now, tz)
  const d = new Date(today + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

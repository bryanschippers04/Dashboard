// Helpers for figuring out "last week" (Monday through Sunday).
// Used by the weekly insights cron and by anything that asks
// "show me this past week's stuff."

export interface DateRange {
  start: Date
  end: Date
}

export interface DateRangeISO {
  start: string
  end: string
}

// Returns { start, end } as Date objects for the last full calendar week.
// "Last week" = the Monday-through-Sunday block that ended most recently.
// If today is Monday, "last week" is the 7 days BEFORE today.
export function getLastWeekRange(now: Date = new Date()): DateRange {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  // JS day index: 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
  const dow = today.getDay()
  // How many days back to the most recent Sunday (end of last week).
  const daysSinceSunday = dow === 0 ? 7 : dow
  const lastSunday = new Date(today)
  lastSunday.setDate(today.getDate() - daysSinceSunday)
  lastSunday.setHours(23, 59, 59, 999)

  const lastMonday = new Date(lastSunday)
  lastMonday.setDate(lastSunday.getDate() - 6)
  lastMonday.setHours(0, 0, 0, 0)

  return { start: lastMonday, end: lastSunday }
}

// Same thing as ISO strings — handy for Supabase queries and Claude payloads.
export function getLastWeekRangeISO(now: Date = new Date()): DateRangeISO {
  const { start, end } = getLastWeekRange(now)
  return { start: start.toISOString(), end: end.toISOString() }
}

// Returns "YYYY-MM-DD" for a date or ISO string.
export function dateOnly(value: string | Date | null | undefined): string | null {
  if (!value) return null
  return new Date(value).toISOString().slice(0, 10)
}

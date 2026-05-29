// Shared formatters for calendar surfaces (/calendar page + home card).
// Kept locale-stable (nl-NL times, en-GB dates) so both surfaces agree.

export interface CalendarEventLite {
  id: string
  summary: string | null
  start_at: string | null
  end_at: string | null
  all_day: boolean
  location: string | null
}

export interface DayGroup<T> {
  day: string // YYYY-MM-DD
  items: T[]
}

export function groupByDay<T extends { start_at: string | null }>(
  events: T[]
): DayGroup<T>[] {
  const map = new Map<string, T[]>()
  for (const e of events) {
    if (!e.start_at) continue
    const day = e.start_at.slice(0, 10)
    if (!map.has(day)) map.set(day, [])
    map.get(day)!.push(e)
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, items]) => ({ day, items }))
}

export function todayIso(now: Date = new Date()): string {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function formatDayHeader(day: string, now: Date = new Date()): string {
  const d = new Date(day + 'T00:00:00')
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
}

export function formatTime(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function eventTimeLabel(e: CalendarEventLite): string {
  return e.all_day ? 'ALL DAY' : formatTime(e.start_at)
}

// '.' / '●' / '●●' / '●●●' — caps at 3.
export function densityDots(count: number): string {
  if (count <= 0) return '.'
  if (count >= 3) return '●●●'
  return '●'.repeat(count)
}

// Single uppercase letter for week-strip headers (M T W T F S S).
export function dayLetter(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'narrow' })
}

// Day-of-month number, zero-padded ('01', '29').
export function dayNumber(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return String(d.getDate()).padStart(2, '0')
}

// 'TUE 02 JUN' uppercase short form (no relative substitution).
export function formatShortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d
    .toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    })
    .toUpperCase()
}

// 'TUE 02' — no month, used inside week strip / home card lines.
export function formatDayShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d
    .toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit' })
    .toUpperCase()
}

// Build a 7-day window of ISO date strings starting at `startIso`.
export function buildWeek(startIso: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysIso(startIso, i))
}

// Monday-anchored start of the week containing `iso`.
export function weekStartIso(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  const dow = d.getDay() // 0=Sun..6=Sat
  const mondayDelta = (dow + 6) % 7 // Sun→6, Mon→0, Tue→1...
  d.setDate(d.getDate() - mondayDelta)
  return d.toISOString().slice(0, 10)
}

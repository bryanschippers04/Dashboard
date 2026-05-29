// Shared formatters for calendar surfaces (/calendar page + home card).
//
// All date math is done in UTC — ISO 'YYYY-MM-DD' strings are treated as
// timezone-agnostic dates and parsed via Date.UTC, never via the
// `'YYYY-MM-DDT00:00:00'` shortcut (which parses as LOCAL time and then
// drifts when round-tripped through `.toISOString()`).
// `toLocaleDateString` is always called with `timeZone: 'UTC'` for the
// same reason.

export interface CalendarEventLite {
  id: string
  summary: string | null
  start_at: string | null
  end_at: string | null
  all_day: boolean
  location: string | null
  description?: string | null
}

export interface DayGroup<T> {
  day: string // YYYY-MM-DD
  items: T[]
}

// ── Parsing / formatting helpers ──────────────────────────────────────────

function parseIsoParts(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m, d }
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function utcDateFromIso(iso: string): Date {
  const { y, m, d } = parseIsoParts(iso)
  return new Date(Date.UTC(y, m - 1, d))
}

// ── Grouping ─────────────────────────────────────────────────────────────

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

// ── ISO date arithmetic (all UTC) ────────────────────────────────────────

export function todayIso(now: Date = new Date()): string {
  // Local YYYY-MM-DD — derived from local components, no UTC conversion.
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDaysIso(iso: string, days: number): string {
  const dt = utcDateFromIso(iso)
  dt.setUTCDate(dt.getUTCDate() + days)
  return toIsoDate(dt)
}

export function monthStartIso(iso: string): string {
  const { y, m } = parseIsoParts(iso)
  return `${y}-${String(m).padStart(2, '0')}-01`
}

// Year/month arithmetic done on integer indices — no Date involvement, so
// no "31 Jan + 1 month = something weird" edge cases.
export function addMonthsIso(iso: string, months: number): string {
  const { y, m } = parseIsoParts(iso)
  const total = y * 12 + (m - 1) + months
  const newY = Math.floor(total / 12)
  const newM = (total % 12) + 1
  return `${newY}-${String(newM).padStart(2, '0')}-01`
}

// Monday-anchored start of the week containing `iso`.
export function weekStartIso(iso: string): string {
  const dt = utcDateFromIso(iso)
  const dow = dt.getUTCDay() // 0=Sun..6=Sat
  const mondayDelta = (dow + 6) % 7
  dt.setUTCDate(dt.getUTCDate() - mondayDelta)
  return toIsoDate(dt)
}

// True if `iso` falls within the same calendar month as `refIso`.
export function isSameMonth(iso: string, refIso: string): boolean {
  return iso.slice(0, 7) === refIso.slice(0, 7)
}

// Build a 7-day window starting at `startIso`.
export function buildWeek(startIso: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysIso(startIso, i))
}

// 6×7 month grid window for the month containing `iso`, Monday-anchored.
// Always exactly 42 cells for stable layout.
export function monthGridWindow(iso: string): string[] {
  const start = weekStartIso(monthStartIso(iso))
  return Array.from({ length: 42 }, (_, i) => addDaysIso(start, i))
}

// ── Time formatters ──────────────────────────────────────────────────────

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

// ── Date label formatters (all UTC-anchored) ─────────────────────────────

export function formatDayHeader(day: string, now: Date = new Date()): string {
  const today = todayIso(now)
  const diff = isoDiffDays(today, day)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return utcDateFromIso(day)
    .toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
    })
}

function isoDiffDays(fromIso: string, toIso: string): number {
  const a = utcDateFromIso(fromIso).getTime()
  const b = utcDateFromIso(toIso).getTime()
  return Math.round((b - a) / 86_400_000)
}

// Single uppercase letter for week-strip / grid headers (M T W T F S S).
export function dayLetter(iso: string): string {
  return utcDateFromIso(iso).toLocaleDateString('en-GB', {
    weekday: 'narrow',
    timeZone: 'UTC',
  })
}

// '01' … '31' — zero-padded day of month.
export function dayNumber(iso: string): string {
  return String(parseIsoParts(iso).d).padStart(2, '0')
}

// 'TUE 02 JUN' uppercase short form.
export function formatShortDate(iso: string): string {
  return utcDateFromIso(iso)
    .toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
    })
    .toUpperCase()
}

// 'TUE 02' — used in week strip / home card lines.
export function formatDayShort(iso: string): string {
  return utcDateFromIso(iso)
    .toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      timeZone: 'UTC',
    })
    .toUpperCase()
}

// 'MAY 2026' — month-view title.
export function formatMonthTitle(iso: string): string {
  return utcDateFromIso(iso)
    .toLocaleDateString('en-GB', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    })
    .toUpperCase()
}

// 'WEEK OF 25 MAY – 31 MAY' — week-view title.
export function formatWeekTitle(iso: string): string {
  const start = utcDateFromIso(iso)
  const end = utcDateFromIso(addDaysIso(iso, 6))
  const fmt = (d: Date) =>
    d
      .toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        timeZone: 'UTC',
      })
      .toUpperCase()
  return `WEEK OF ${fmt(start)} – ${fmt(end)}`
}

// 'FRI 29 MAY 2026' — modal header.
export function formatFullDate(iso: string): string {
  return utcDateFromIso(iso)
    .toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    })
    .toUpperCase()
}

// ── Misc ─────────────────────────────────────────────────────────────────

// '.' / '●' / '●●' / '●●●' — caps at 3.
export function densityDots(count: number): string {
  if (count <= 0) return '.'
  if (count >= 3) return '●●●'
  return '●'.repeat(count)
}

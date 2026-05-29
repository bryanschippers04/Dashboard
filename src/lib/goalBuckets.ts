// Single source of truth for goal urgency bucketing + deadline
// formatting. Used by /goals page and the home dashboard card so
// both views stay in lockstep.

export type GoalBucket = 'overdue' | 'week' | 'month' | 'later' | 'undated'

export const BUCKET_ORDER: GoalBucket[] = [
  'overdue',
  'week',
  'month',
  'later',
  'undated',
]

export const BUCKET_LABELS: Record<GoalBucket, string> = {
  overdue: 'OVERDUE',
  week: 'THIS WEEK',
  month: 'THIS MONTH',
  later: 'LATER',
  undated: 'UNDATED',
}

// Local-midnight reference. Goal deadlines are stored as DATE (no time)
// so all comparisons are day-granular and tz-stable.
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function parseDeadline(deadline: string): Date | null {
  const m = deadline.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const [, y, mo, da] = m
  return new Date(Number(y), Number(mo) - 1, Number(da))
}

export function daysUntil(deadline: string, now: Date = new Date()): number {
  const d = parseDeadline(deadline)
  if (!d) return 0
  const today = startOfDay(now)
  const diffMs = d.getTime() - today.getTime()
  return Math.round(diffMs / 86400000)
}

export function bucketFor(
  deadline: string | null | undefined,
  now: Date = new Date()
): GoalBucket {
  if (!deadline) return 'undated'
  const days = daysUntil(deadline, now)
  if (days < 0) return 'overdue'
  if (days <= 7) return 'week'
  if (days <= 30) return 'month'
  return 'later'
}

// '2d ago' | 'today' | 'in 3d' | 'in 4mo' | 'no deadline'
export function formatDeadline(
  deadline: string | null | undefined,
  now: Date = new Date()
): string {
  if (!deadline) return 'no deadline'
  const days = daysUntil(deadline, now)
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  if (days < 0) {
    const n = -days
    if (n < 30) return `${n}d ago`
    const months = Math.round(n / 30)
    return `${months}mo ago`
  }
  if (days < 30) return `in ${days}d`
  const months = Math.round(days / 30)
  if (months < 12) return `in ${months}mo`
  const years = Math.round(months / 12)
  return `in ${years}y`
}

// Compare two goals within the same bucket: nulls last, earliest first.
export function compareByDeadline(
  a: string | null | undefined,
  b: string | null | undefined
): number {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return a.localeCompare(b)
}

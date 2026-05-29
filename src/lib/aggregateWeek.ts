// Builds the payload sent to Claude for the weekly insights run.
// Pure function: takes raw week data, returns a plain object ready
// to JSON.stringify into the user message.
//
// The caller is responsible for fetching everything (Supabase rows
// + Google Calendar events) and for picking the date range. By
// convention the range is the last calendar week (Mon 00:00 through
// Sun 23:59) in the user's local timezone.

import { dateOnly } from './dateRange'

// --- Input shapes (loose so any DB row works) ---

export interface JournalEntryInput {
  text: string
  timestamp: string | Date
  rating: number | null
  mood_tags: string[] | null
  language?: string | null
  sleep_minutes?: number | null
  energy?: number | null
  productivity?: number | null
  exercise?: string | null
  time_outside?: string | null
  phone_time_minutes?: number | null
}

export interface TransactionInput {
  amount: number | string
  category?: string | null
  date: string | Date
}

export interface ScreenTimeInput {
  duration_minutes: number
  app_name: string
  date: string | Date
}

export interface GoalInput {
  title: string
  deadline: string | null
  target: number | string
  current_progress: number | string
}

export interface CalendarEventInput {
  start?: string | Date
  date?: string | Date
  title?: string
  summary?: string
}

export interface MemoryInsightInput {
  insight_type: string
  title?: string | null
  body?: string | null
  content?: string | null
  week_start?: string | null
  day?: string | null
  scope?: string | null
}

export interface MemoryDistillationInput {
  week_start: string
  summary: string
}

export interface MemoryInput {
  starred?: MemoryInsightInput[]
  distillations?: MemoryDistillationInput[]
  recent?: MemoryInsightInput[]
}

export interface HabitInput {
  title: string
  cadence: string
  target_count: number
  current_count: number
  streak: number
  hit_target: boolean
}

export interface AggregateWeekArgs {
  weekStart: string | Date
  weekEnd: string | Date
  journalEntries?: JournalEntryInput[]
  transactions?: TransactionInput[]
  screenTime?: ScreenTimeInput[]
  goals?: GoalInput[]
  calendarEvents?: CalendarEventInput[]
  habits?: HabitInput[]
  memory?: MemoryInput
}

// --- Output shape ---

export interface WeekPayload {
  week: { start: string; end: string }
  journal: Array<{
    date: string | null
    rating: number | null
    mood_tags: string[]
    text: string
    sleep_minutes: number | null
    energy: number | null
    productivity: number | null
    exercise: string | null
    time_outside: string | null
    phone_time_minutes: number | null
  }>
  spending: {
    total: number
    by_day: Record<string, number>
    by_category: Record<string, number>
    transaction_count: number
  }
  screen_time: {
    total_minutes: number
    by_day: Record<string, number>
    top_apps: Array<{ app: string; minutes: number }>
  }
  goals: Array<{
    title: string
    deadline: string | null
    days_until: number | null
    target: number
    current: number
    percent: number | null
  }>
  calendar: Array<{ date: string | null; title: string }>
  habits: Array<{
    title: string
    cadence: string
    target: number
    current: number
    streak: number
    hit_target: boolean
  }>
  memory: {
    starred: Array<{ type: string; title: string; body: string }>
    distillations: Array<{ week_start: string; summary: string }>
    recent: Array<{ type: string; title: string; body: string; when: string | null }>
  }
}

export function aggregateWeek({
  weekStart,
  weekEnd,
  journalEntries = [],
  transactions = [],
  screenTime = [],
  goals = [],
  calendarEvents = [],
  habits = [],
  memory = {}
}: AggregateWeekArgs): WeekPayload {
  return {
    week: {
      start: toISO(weekStart),
      end: toISO(weekEnd)
    },
    journal: buildJournal(journalEntries),
    spending: buildSpending(transactions),
    screen_time: buildScreenTime(screenTime),
    goals: buildGoals(goals),
    calendar: buildCalendar(calendarEvents),
    habits: buildHabits(habits),
    memory: buildMemory(memory)
  }
}

function buildHabits(habits: HabitInput[]) {
  return habits.map((h) => ({
    title: h.title,
    cadence: h.cadence,
    target: h.target_count,
    current: h.current_count,
    streak: h.streak,
    hit_target: h.hit_target,
  }))
}

export function buildMemory(memory: MemoryInput) {
  return {
    starred: (memory.starred ?? []).map(toMemoryInsight),
    distillations: (memory.distillations ?? []).map((d) => ({
      week_start: d.week_start,
      summary: d.summary,
    })),
    recent: (memory.recent ?? []).map((i) => ({
      ...toMemoryInsight(i),
      when: i.day ?? i.week_start ?? null,
    })),
  }
}

function toMemoryInsight(i: MemoryInsightInput) {
  const title = i.title?.trim() ?? ''
  const body = i.body?.trim() ?? ''
  // Older rows used `content` only. Fall back so memory still works.
  const fallback = i.content?.trim() ?? ''
  return {
    type: i.insight_type,
    title: title || fallback,
    body: title ? body : '',
  }
}

function buildJournal(entries: JournalEntryInput[]) {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
  return sorted.map(e => ({
    date: dateOnly(e.timestamp),
    rating: e.rating,
    mood_tags: e.mood_tags ?? [],
    text: e.text,
    sleep_minutes: e.sleep_minutes ?? null,
    energy: e.energy ?? null,
    productivity: e.productivity ?? null,
    exercise: e.exercise ?? null,
    time_outside: e.time_outside ?? null,
    phone_time_minutes: e.phone_time_minutes ?? null,
  }))
}

function buildSpending(transactions: TransactionInput[]) {
  const byDay: Record<string, number> = {}
  const byCategory: Record<string, number> = {}
  let total = 0

  for (const t of transactions) {
    const day = dateOnly(t.date) ?? 'unknown'
    const amount = Number(t.amount) || 0
    total += amount
    byDay[day] = (byDay[day] ?? 0) + amount
    const cat = t.category || 'uncategorized'
    byCategory[cat] = (byCategory[cat] ?? 0) + amount
  }

  return {
    total: round2(total),
    by_day: mapValues(byDay, round2),
    by_category: mapValues(byCategory, round2),
    transaction_count: transactions.length
  }
}

function buildScreenTime(entries: ScreenTimeInput[]) {
  const byDay: Record<string, number> = {}
  const byApp: Record<string, number> = {}

  for (const e of entries) {
    const day = dateOnly(e.date) ?? 'unknown'
    const mins = Number(e.duration_minutes) || 0
    byDay[day] = (byDay[day] ?? 0) + mins
    const app = e.app_name || 'unknown'
    byApp[app] = (byApp[app] ?? 0) + mins
  }

  const topApps = Object.entries(byApp)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([app, minutes]) => ({ app, minutes }))

  const totalMinutes = Object.values(byDay).reduce((a, b) => a + b, 0)

  return {
    total_minutes: totalMinutes,
    by_day: byDay,
    top_apps: topApps
  }
}

function buildGoals(goals: GoalInput[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return goals.map(g => {
    const target = Number(g.target) || 0
    const current = Number(g.current_progress) || 0
    let daysUntil: number | null = null
    if (g.deadline) {
      const m = g.deadline.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (m) {
        const due = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
        daysUntil = Math.round((due.getTime() - today.getTime()) / 86400000)
      }
    }
    return {
      title: g.title,
      deadline: g.deadline ?? null,
      days_until: daysUntil,
      target,
      current,
      percent: target > 0 ? Math.round((current / target) * 100) : null
    }
  })
}

function buildCalendar(events: CalendarEventInput[]) {
  return events.map(e => ({
    date: dateOnly(e.start ?? e.date ?? null),
    title: e.title ?? e.summary ?? ''
  }))
}

function toISO(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function mapValues<T>(obj: Record<string, T>, fn: (v: T) => T): Record<string, T> {
  const out: Record<string, T> = {}
  for (const [k, v] of Object.entries(obj)) out[k] = fn(v)
  return out
}

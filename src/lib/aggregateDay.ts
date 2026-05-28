// Builds the payload sent to Claude for a daily insights run.
// Mirrors aggregateWeek.ts but for a single day.

import { dateOnly } from './dateRange'
import { buildMemory, type MemoryInput } from './aggregateWeek'

export interface DayJournalInput {
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

export interface DayTransactionInput {
  amount: number | string
  category?: string | null
  merchant?: string | null
  date: string | Date
}

export interface DayGoalInput {
  title: string
  type: string
  target: number | string
  current_progress: number | string
}

export interface DayCalendarEventInput {
  start?: string | Date | null
  end?: string | Date | null
  title?: string | null
  summary?: string | null
}

export interface AggregateDayArgs {
  day: string | Date
  journalEntries?: DayJournalInput[]
  transactions?: DayTransactionInput[]
  goals?: DayGoalInput[]
  calendarEvents?: DayCalendarEventInput[]
  memory?: MemoryInput
}

export interface DayPayload {
  day: string
  journal: Array<{
    time: string | null
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
    transaction_count: number
    by_category: Record<string, number>
    items: Array<{ merchant: string | null; amount: number; category: string | null }>
  }
  goals: Array<{
    title: string
    type: string
    target: number
    current: number
    percent: number | null
  }>
  calendar: Array<{ time: string | null; title: string }>
  memory: ReturnType<typeof buildMemory>
}

export function aggregateDay({
  day,
  journalEntries = [],
  transactions = [],
  goals = [],
  calendarEvents = [],
  memory = {},
}: AggregateDayArgs): DayPayload {
  return {
    day: dateOnly(day) ?? '',
    journal: buildJournal(journalEntries),
    spending: buildSpending(transactions),
    goals: buildGoals(goals),
    calendar: buildCalendar(calendarEvents),
    memory: buildMemory(memory),
  }
}

function buildCalendar(events: DayCalendarEventInput[]) {
  return events.map((e) => {
    const startIso =
      e.start instanceof Date ? e.start.toISOString() : (e.start ?? null)
    return {
      time: startIso ? startIso.slice(11, 16) : null,
      title: e.title ?? e.summary ?? '',
    }
  })
}

function buildJournal(entries: DayJournalInput[]) {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
  return sorted.map((e) => ({
    time:
      typeof e.timestamp === 'string'
        ? e.timestamp.slice(11, 16)
        : e.timestamp.toISOString().slice(11, 16),
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

function buildSpending(transactions: DayTransactionInput[]) {
  const byCategory: Record<string, number> = {}
  let total = 0
  const items: Array<{
    merchant: string | null
    amount: number
    category: string | null
  }> = []

  for (const t of transactions) {
    const amount = Number(t.amount) || 0
    total += amount
    const cat = t.category || 'uncategorized'
    byCategory[cat] = (byCategory[cat] ?? 0) + amount
    items.push({
      merchant: t.merchant ?? null,
      amount: round2(amount),
      category: t.category ?? null,
    })
  }

  return {
    total: round2(total),
    transaction_count: transactions.length,
    by_category: mapValues(byCategory, round2),
    items,
  }
}

function buildGoals(goals: DayGoalInput[]) {
  return goals.map((g) => {
    const target = Number(g.target) || 0
    const current = Number(g.current_progress) || 0
    return {
      title: g.title,
      type: g.type,
      target,
      current,
      percent: target > 0 ? Math.round((current / target) * 100) : null,
    }
  })
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function mapValues<T>(obj: Record<string, T>, fn: (v: T) => T): Record<string, T> {
  const out: Record<string, T> = {}
  for (const [k, v] of Object.entries(obj)) out[k] = fn(v)
  return out
}

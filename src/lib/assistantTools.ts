// Tool catalog for the in-app assistant. Each tool is a JSON schema
// Claude sees + a server-side executor that talks to Supabase using
// the admin client (already auth-checked by the caller route).
//
// Adding a new tool: drop a new entry in TOOLS. Claude picks it up
// automatically — no other wiring needed.

import type { SupabaseClient } from '@supabase/supabase-js'
import { createAndCacheEvent, getEventsInRange } from './calendarServer'
import { getHabitsWithProgress } from './habitsServer'
import { currentPeriodKey, type Cadence } from './habits'

export interface ToolExecutorCtx {
  userId: string
  admin: SupabaseClient
}

export interface ToolEntry {
  name: string
  description: string
  input_schema: Record<string, unknown>
  execute: (
    input: Record<string, unknown>,
    ctx: ToolExecutorCtx
  ) => Promise<unknown>
}

// ---------- Todos ----------

const listTodos: ToolEntry = {
  name: 'list_todos',
  description:
    'List the user\'s todos. Use when asked "what is on my list" or to find a todo by name before updating it.',
  input_schema: {
    type: 'object',
    properties: {
      only_open: {
        type: 'boolean',
        description: 'If true, exclude completed todos. Default true.',
      },
      limit: {
        type: 'number',
        description: 'Max number of todos to return. Default 20.',
      },
    },
  },
  async execute(input, { admin, userId }) {
    const onlyOpen = input.only_open !== false
    const limit = typeof input.limit === 'number' ? input.limit : 20
    let q = admin
      .from('todos')
      .select('id, title, completed, due_date')
      .eq('user_id', userId)
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(limit)
    if (onlyOpen) q = q.eq('completed', false)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return { todos: data ?? [] }
  },
}

const createTodo: ToolEntry = {
  name: 'create_todo',
  description: 'Add a new todo. Use the user\'s exact wording for the title.',
  input_schema: {
    type: 'object',
    required: ['title'],
    properties: {
      title: { type: 'string', description: 'What the todo says.' },
      due_date: {
        type: 'string',
        description: 'Optional ISO date (YYYY-MM-DD) for when it\'s due.',
      },
    },
  },
  async execute(input, { admin, userId }) {
    const title = typeof input.title === 'string' ? input.title.trim() : ''
    if (!title) throw new Error('title is required')
    const due_date =
      typeof input.due_date === 'string' && input.due_date.match(/^\d{4}-\d{2}-\d{2}$/)
        ? input.due_date
        : null
    const { data, error } = await admin
      .from('todos')
      .insert({ user_id: userId, title, due_date, completed: false })
      .select('id, title, due_date')
      .single()
    if (error) throw new Error(error.message)
    return { created: data }
  },
}

const completeTodo: ToolEntry = {
  name: 'complete_todo',
  description:
    'Mark a specific todo as completed. If you don\'t know the id, list_todos first and match by title.',
  input_schema: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', description: 'The todo id.' },
    },
  },
  async execute(input, { admin, userId }) {
    const id = typeof input.id === 'string' ? input.id : ''
    if (!id) throw new Error('id is required')
    const { error } = await admin
      .from('todos')
      .update({ completed: true })
      .eq('id', id)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
    return { completed: id }
  },
}

const deleteTodo: ToolEntry = {
  name: 'delete_todo',
  description:
    'Delete a todo by id. Use sparingly — prefer complete_todo for done items.',
  input_schema: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string' } },
  },
  async execute(input, { admin, userId }) {
    const id = typeof input.id === 'string' ? input.id : ''
    if (!id) throw new Error('id is required')
    const { error } = await admin
      .from('todos')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
    return { deleted: id }
  },
}

// ---------- Goals ----------

const listGoals: ToolEntry = {
  name: 'list_goals',
  description:
    'List the user\'s goals with target, current progress, and deadline (YYYY-MM-DD or null). Goals are aspirational targets ordered by deadline urgency; recurring expectations live in habits instead.',
  input_schema: { type: 'object', properties: {} },
  async execute(_input, { admin, userId }) {
    const { data, error } = await admin
      .from('goals')
      .select('id, title, deadline, target, current_progress')
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
    return { goals: data ?? [] }
  },
}

const updateGoalProgress: ToolEntry = {
  name: 'update_goal_progress',
  description:
    'Bump a goal\'s current_progress by delta (positive or negative). Capped to [0, target].',
  input_schema: {
    type: 'object',
    required: ['id', 'delta'],
    properties: {
      id: { type: 'string' },
      delta: { type: 'number', description: 'How much to add (negative to undo).' },
    },
  },
  async execute(input, { admin, userId }) {
    const id = typeof input.id === 'string' ? input.id : ''
    const delta = typeof input.delta === 'number' ? input.delta : 0
    if (!id) throw new Error('id is required')
    const { data: row, error: rErr } = await admin
      .from('goals')
      .select('current_progress, target')
      .eq('id', id)
      .eq('user_id', userId)
      .single()
    if (rErr) throw new Error(rErr.message)
    const target = Number(row.target)
    const next = Math.max(
      0,
      Math.min(target, Number(row.current_progress) + delta)
    )
    const { error } = await admin
      .from('goals')
      .update({ current_progress: next })
      .eq('id', id)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
    return { current_progress: next, target }
  },
}

// ---------- Journal ----------

const createJournalEntry: ToolEntry = {
  name: 'create_journal_entry',
  description:
    'Add a journal entry. The compact bullets are auto-generated server-side — pass the raw text the user said.',
  input_schema: {
    type: 'object',
    required: ['text'],
    properties: {
      text: { type: 'string', description: 'Raw entry text.' },
      rating: { type: 'number', description: 'Optional mood 0-10.' },
      mood_tags: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Optional mood tag chips (e.g. ["focused", "tired"]). Must match existing tags.',
      },
    },
  },
  async execute(input, { admin, userId }) {
    const text = typeof input.text === 'string' ? input.text.trim() : ''
    if (!text) throw new Error('text is required')
    const rating =
      typeof input.rating === 'number' && input.rating >= 0 && input.rating <= 10
        ? Math.round(input.rating)
        : null
    const moodTags = Array.isArray(input.mood_tags)
      ? input.mood_tags.filter((t): t is string => typeof t === 'string')
      : null
    // Insert directly without Claude compacting from here — keep the
    // assistant call cheap; the user can edit afterwards on /journal.
    const { data, error } = await admin
      .from('journal_entries')
      .insert({
        user_id: userId,
        text,
        rating,
        mood_tags: moodTags && moodTags.length > 0 ? moodTags : null,
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return { id: data.id, text_length: text.length }
  },
}

// ---------- Finance (read) ----------

const queryRecentSpending: ToolEntry = {
  name: 'query_recent_spending',
  description:
    'Sum the user\'s outgoing transactions (amount < 0) over the given window. Returns totals + breakdown by category.',
  input_schema: {
    type: 'object',
    properties: {
      days: {
        type: 'number',
        description: 'How many days back from today. Default 7.',
      },
      category: {
        type: 'string',
        description: 'Optional category filter (e.g. "groceries").',
      },
    },
  },
  async execute(input, { admin, userId }) {
    const days = typeof input.days === 'number' ? input.days : 7
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
    let q = admin
      .from('transactions')
      .select('amount, category, merchant, date')
      .eq('user_id', userId)
      .gte('date', cutoff)
      .lt('amount', 0)
    if (input.category && typeof input.category === 'string') {
      q = q.eq('category', input.category)
    }
    const { data, error } = await q
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as Array<{
      amount: number
      category: string | null
      merchant: string | null
      date: string
    }>
    let total = 0
    const byCategory: Record<string, number> = {}
    for (const r of rows) {
      const out = Math.abs(Number(r.amount))
      total += out
      const cat = r.category ?? 'other'
      byCategory[cat] = (byCategory[cat] ?? 0) + out
    }
    return {
      window_days: days,
      total_eur: round2(total),
      by_category: Object.fromEntries(
        Object.entries(byCategory).map(([k, v]) => [k, round2(v)])
      ),
      count: rows.length,
    }
  },
}

// ---------- Calendar (read) ----------

const listUpcomingEvents: ToolEntry = {
  name: 'list_upcoming_events',
  description:
    'List calendar events between now and N days ahead. Pulls from the cached calendar_events table.',
  input_schema: {
    type: 'object',
    properties: {
      days: {
        type: 'number',
        description: 'Days ahead from now. Default 7.',
      },
    },
  },
  async execute(input, { admin, userId }) {
    const days = typeof input.days === 'number' ? input.days : 7
    const now = new Date()
    const to = new Date(now.getTime() + days * 86400000)
    const events = await getEventsInRange(userId, now, to)
    void admin // executor signature accepts admin; getEventsInRange uses its own.
    return { events }
  },
}

const createCalendarEventTool: ToolEntry = {
  name: 'create_calendar_event',
  description:
    'Create an event on the user\'s primary Google Calendar. For timed events pass RFC3339 timestamps with timezone offset (e.g. "2026-06-04T15:00:00+02:00") in start_datetime/end_datetime. For all-day events pass YYYY-MM-DD in start_date/end_date — note Google treats end_date as EXCLUSIVE (a one-day event has end_date = start_date + 1). Confirm date/time with the user before calling if ambiguous.',
  input_schema: {
    type: 'object',
    required: ['summary'],
    properties: {
      summary: {
        type: 'string',
        description: 'Event title — use the user\'s wording.',
      },
      start_datetime: {
        type: 'string',
        description:
          'RFC3339 start for timed events, e.g. "2026-06-04T15:00:00+02:00". Mutually exclusive with start_date.',
      },
      end_datetime: {
        type: 'string',
        description:
          'RFC3339 end for timed events. If omitted for a timed event, defaults to start + 1 hour.',
      },
      start_date: {
        type: 'string',
        description:
          'YYYY-MM-DD start for all-day events. Mutually exclusive with start_datetime.',
      },
      end_date: {
        type: 'string',
        description:
          'YYYY-MM-DD exclusive end for all-day events. Omit for a single-day event (server fills in start + 1 day).',
      },
      timezone: {
        type: 'string',
        description:
          'IANA tz name for timed events (e.g. "Europe/Amsterdam"). Optional — Google will use the calendar\'s default if absent.',
      },
      location: { type: 'string' },
      description: { type: 'string' },
    },
  },
  async execute(input, { userId }) {
    const summary = typeof input.summary === 'string' ? input.summary.trim() : ''
    if (!summary) throw new Error('summary is required')

    const startDt = typeof input.start_datetime === 'string' ? input.start_datetime : null
    const endDt = typeof input.end_datetime === 'string' ? input.end_datetime : null
    const startD = typeof input.start_date === 'string' ? input.start_date : null
    const endD = typeof input.end_date === 'string' ? input.end_date : null
    const tz = typeof input.timezone === 'string' ? input.timezone : undefined

    let start: CreateEventInputStart
    let end: CreateEventInputStart

    if (startDt) {
      const startMs = Date.parse(startDt)
      if (Number.isNaN(startMs))
        throw new Error('start_datetime must be RFC3339')
      const endIso = endDt ?? new Date(startMs + 3600_000).toISOString()
      start = { dateTime: startDt, timeZone: tz }
      end = { dateTime: endIso, timeZone: tz }
    } else if (startD) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startD))
        throw new Error('start_date must be YYYY-MM-DD')
      let endDate = endD
      if (!endDate) {
        const d = new Date(startD + 'T00:00:00Z')
        d.setUTCDate(d.getUTCDate() + 1)
        endDate = d.toISOString().slice(0, 10)
      }
      start = { date: startD }
      end = { date: endDate }
    } else {
      throw new Error('Provide either start_datetime or start_date')
    }

    const created = await createAndCacheEvent(userId, {
      summary,
      start,
      end,
      location:
        typeof input.location === 'string' && input.location.trim()
          ? input.location.trim()
          : undefined,
      description:
        typeof input.description === 'string' && input.description.trim()
          ? input.description.trim()
          : undefined,
    })
    return {
      id: created.id,
      summary: created.summary,
      start: created.start,
      end: created.end,
    }
  },
}

type CreateEventInputStart = { dateTime?: string; date?: string; timeZone?: string }

// ---------- Habits ----------

const listHabits: ToolEntry = {
  name: 'list_habits',
  description:
    'List the user\'s habits with current-period progress and streak. Use for "what habits do I have", "what\'s left today", or to find an id before ticking/unticking.',
  input_schema: {
    type: 'object',
    properties: {
      cadence: {
        type: 'string',
        enum: ['daily', 'weekly', 'monthly'],
        description: 'Optional filter — only return habits with this cadence.',
      },
    },
  },
  async execute(input, { admin, userId }) {
    const all = await getHabitsWithProgress(admin, userId)
    const filtered =
      typeof input.cadence === 'string'
        ? all.filter((h) => h.cadence === input.cadence)
        : all
    return { habits: filtered }
  },
}

const tickHabit: ToolEntry = {
  name: 'tick_habit',
  description:
    'Log one completion for a habit in its current period. Use the id from list_habits. Calling more than once in the same period is allowed for target_count > 1 habits.',
  input_schema: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', description: 'Habit id.' } },
  },
  async execute(input, { admin, userId }) {
    const id = typeof input.id === 'string' ? input.id : ''
    if (!id) throw new Error('id is required')
    const { data: habit, error: hErr } = await admin
      .from('habits')
      .select('cadence')
      .eq('id', id)
      .eq('user_id', userId)
      .single()
    if (hErr) throw new Error(hErr.message)
    const periodKey = currentPeriodKey(habit.cadence as Cadence)
    const { error } = await admin
      .from('habit_completions')
      .insert({ habit_id: id, user_id: userId, period_key: periodKey })
    if (error) throw new Error(error.message)
    return { ticked: id, period_key: periodKey }
  },
}

const untickHabit: ToolEntry = {
  name: 'untick_habit',
  description:
    'Undo the most recent completion of a habit in its current period. Use when the user says "undo gym" or similar.',
  input_schema: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string' } },
  },
  async execute(input, { admin, userId }) {
    const id = typeof input.id === 'string' ? input.id : ''
    if (!id) throw new Error('id is required')
    const { data: habit, error: hErr } = await admin
      .from('habits')
      .select('cadence')
      .eq('id', id)
      .eq('user_id', userId)
      .single()
    if (hErr) throw new Error(hErr.message)
    const periodKey = currentPeriodKey(habit.cadence as Cadence)
    const { data: rows } = await admin
      .from('habit_completions')
      .select('id')
      .eq('habit_id', id)
      .eq('user_id', userId)
      .eq('period_key', periodKey)
      .order('occurred_at', { ascending: false })
      .limit(1)
    const row = (rows ?? [])[0] as { id: string } | undefined
    if (!row) return { unticked: id, removed: 0 }
    const { error } = await admin
      .from('habit_completions')
      .delete()
      .eq('id', row.id)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
    return { unticked: id, removed: 1 }
  },
}

const createHabit: ToolEntry = {
  name: 'create_habit',
  description:
    'Add a new habit. Use when the user says "add a daily habit to X" or similar. Default target_count is 1 unless the user specifies a number ("3x weekly", "2 times a day").',
  input_schema: {
    type: 'object',
    required: ['title', 'cadence'],
    properties: {
      title: { type: 'string' },
      cadence: {
        type: 'string',
        enum: ['daily', 'weekly', 'monthly'],
      },
      target_count: {
        type: 'number',
        description: 'How many times per period. Default 1.',
      },
    },
  },
  async execute(input, { admin, userId }) {
    const title = typeof input.title === 'string' ? input.title.trim() : ''
    if (!title) throw new Error('title is required')
    const cadence = input.cadence as Cadence
    if (!['daily', 'weekly', 'monthly'].includes(cadence))
      throw new Error('cadence must be daily|weekly|monthly')
    const target_count =
      typeof input.target_count === 'number' && input.target_count >= 1
        ? Math.floor(input.target_count)
        : 1
    const { data, error } = await admin
      .from('habits')
      .insert({ user_id: userId, title, cadence, target_count })
      .select('id, title, cadence, target_count')
      .single()
    if (error) throw new Error(error.message)
    return { created: data }
  },
}

// ---------- Insights memory (read) ----------

const recallStarredInsights: ToolEntry = {
  name: 'recall_starred_insights',
  description:
    'Read back the user\'s starred insights (canonical truths). Use when asked "what have you told me about X" or before drafting personal recommendations.',
  input_schema: { type: 'object', properties: {} },
  async execute(_input, { admin, userId }) {
    const { data, error } = await admin
      .from('insights')
      .select('title, body, insight_type')
      .eq('user_id', userId)
      .eq('is_starred', true)
    if (error) throw new Error(error.message)
    return { starred: data ?? [] }
  },
}

// ---------- Registry ----------

export const TOOLS: ToolEntry[] = [
  listTodos,
  createTodo,
  completeTodo,
  deleteTodo,
  listGoals,
  updateGoalProgress,
  listHabits,
  tickHabit,
  untickHabit,
  createHabit,
  createJournalEntry,
  queryRecentSpending,
  listUpcomingEvents,
  createCalendarEventTool,
  recallStarredInsights,
]

export const TOOL_DEFS = TOOLS.map((t) => ({
  name: t.name,
  description: t.description,
  input_schema: t.input_schema,
}))

export function findTool(name: string): ToolEntry | undefined {
  return TOOLS.find((t) => t.name === name)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

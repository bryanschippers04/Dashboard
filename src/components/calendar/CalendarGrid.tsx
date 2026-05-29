'use client'

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'
import {
  addMonthsIso,
  addDaysIso,
  type CalendarEventLite,
  formatMonthTitle,
  formatWeekTitle,
  groupByDay,
  monthStartIso,
  weekStartIso,
} from '@/lib/calendarFormat'
import MonthGrid from './MonthGrid'
import WeekGrid from './WeekGrid'
import DayDetailModal from './DayDetailModal'

type ViewMode = 'month' | 'week'
const STORAGE_KEY = 'calendar-view'
const VIEW_EVENT = 'calendar-view-change'

function subscribeView(cb: () => void): () => void {
  window.addEventListener(VIEW_EVENT, cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener(VIEW_EVENT, cb)
    window.removeEventListener('storage', cb)
  }
}

function getViewSnapshot(): ViewMode {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    return v === 'week' ? 'week' : 'month'
  } catch {
    return 'month'
  }
}

function getViewServerSnapshot(): ViewMode {
  return 'month'
}

interface Props {
  events: CalendarEventLite[]
  todayIso: string
}

export default function CalendarGrid({ events, todayIso }: Props) {
  const view = useSyncExternalStore(
    subscribeView,
    getViewSnapshot,
    getViewServerSnapshot
  )
  const [focusedIso, setFocusedIso] = useState(todayIso)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const setViewPersistent = useCallback((next: ViewMode) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // localStorage can throw in private-mode contexts; safe to ignore.
    }
    window.dispatchEvent(new Event(VIEW_EVENT))
  }, [])

  // Index events once per render — cheap for our scale (dozens to a few hundred).
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventLite[]>()
    for (const g of groupByDay(events)) map.set(g.day, g.items)
    return map
  }, [events])

  const monthIso = monthStartIso(focusedIso)
  const weekIso = weekStartIso(focusedIso)

  const title =
    view === 'month' ? formatMonthTitle(monthIso) : formatWeekTitle(weekIso)

  const handleNav = (dir: -1 | 1) => {
    if (view === 'month') {
      setFocusedIso(addMonthsIso(monthIso, dir))
    } else {
      setFocusedIso(addDaysIso(weekIso, dir * 7))
    }
  }

  const handleToday = () => setFocusedIso(todayIso)

  const selectedEvents = selectedDay
    ? (eventsByDay.get(selectedDay) ?? [])
    : []

  return (
    <div className="border border-slate-800 bg-[#0a1830] p-3">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleNav(-1)}
            className="text-zinc-500 hover:text-accent text-sm w-7 h-7 flex items-center justify-center transition-colors"
            aria-label={view === 'month' ? 'Previous month' : 'Previous week'}
          >
            ◀
          </button>
          <span className="text-[11px] text-zinc-200 tracking-[0.2em] tabular-nums">
            {title}
          </span>
          <button
            type="button"
            onClick={() => handleNav(1)}
            className="text-zinc-500 hover:text-accent text-sm w-7 h-7 flex items-center justify-center transition-colors"
            aria-label={view === 'month' ? 'Next month' : 'Next week'}
          >
            ▶
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleToday}
            className="text-[10px] text-zinc-500 hover:text-accent tracking-widest px-2 py-1 transition-colors"
          >
            TODAY
          </button>
          <div className="flex border border-slate-700">
            <button
              type="button"
              onClick={() => setViewPersistent('month')}
              className={`text-[10px] tracking-widest px-2 py-1 transition-colors ${
                view === 'month'
                  ? 'bg-accent/10 text-accent'
                  : 'text-zinc-500 hover:text-accent'
              }`}
            >
              MONTH
            </button>
            <button
              type="button"
              onClick={() => setViewPersistent('week')}
              className={`text-[10px] tracking-widest px-2 py-1 border-l border-slate-700 transition-colors ${
                view === 'week'
                  ? 'bg-accent/10 text-accent'
                  : 'text-zinc-500 hover:text-accent'
              }`}
            >
              WEEK
            </button>
          </div>
        </div>
      </div>

      {view === 'month' ? (
        <MonthGrid
          monthIso={monthIso}
          todayIso={todayIso}
          eventsByDay={eventsByDay}
          onSelectDay={setSelectedDay}
        />
      ) : (
        <WeekGrid
          weekStart={weekIso}
          todayIso={todayIso}
          eventsByDay={eventsByDay}
          onSelectDay={setSelectedDay}
        />
      )}

      <DayDetailModal
        iso={selectedDay}
        events={selectedEvents}
        onClose={() => setSelectedDay(null)}
      />
    </div>
  )
}

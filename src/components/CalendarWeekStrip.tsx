'use client'

import { useState } from 'react'
import {
  addDaysIso,
  buildWeek,
  dayLetter,
  dayNumber,
  densityDots,
  weekStartIso,
} from '@/lib/calendarFormat'

interface Props {
  todayIso: string
  // Map of YYYY-MM-DD → count, covering the whole loaded window.
  counts: Record<string, number>
}

export default function CalendarWeekStrip({ todayIso, counts }: Props) {
  const [weekStart, setWeekStart] = useState(() => weekStartIso(todayIso))
  const week = buildWeek(weekStart)

  const handleClick = (iso: string) => {
    const el = document.getElementById(`day-${iso}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const rangeLabel = (() => {
    const start = new Date(week[0] + 'T00:00:00')
    const end = new Date(week[6] + 'T00:00:00')
    const s = start.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    })
    const e = end.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    })
    return `${s} – ${e}`.toLowerCase()
  })()

  return (
    <div className="border border-slate-800 bg-[#0a1830] px-3 py-3 mb-5">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setWeekStart(addDaysIso(weekStart, -7))}
          className="text-zinc-500 hover:text-accent text-sm w-6 h-6 flex items-center justify-center transition-colors"
          aria-label="Previous week"
        >
          ◀
        </button>
        <span className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase tabular-nums">
          week of {rangeLabel}
        </span>
        <button
          onClick={() => setWeekStart(addDaysIso(weekStart, 7))}
          className="text-zinc-500 hover:text-accent text-sm w-6 h-6 flex items-center justify-center transition-colors"
          aria-label="Next week"
        >
          ▶
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {week.map((iso) => {
          const isToday = iso === todayIso
          const count = counts[iso] ?? 0
          return (
            <button
              key={iso}
              onClick={() => handleClick(iso)}
              className={`flex flex-col items-center gap-1 py-2 border transition-colors ${
                isToday
                  ? 'border-accent/50 bg-accent/[0.06]'
                  : 'border-transparent hover:border-slate-700'
              }`}
            >
              <span
                className={`text-[10px] tracking-widest uppercase ${
                  isToday ? 'text-accent' : 'text-zinc-600'
                }`}
              >
                {dayLetter(iso)}
              </span>
              <span
                className={`text-sm tabular-nums ${
                  isToday ? 'text-zinc-100' : 'text-zinc-300'
                }`}
              >
                {dayNumber(iso)}
              </span>
              <span
                className={`text-[10px] tabular-nums tracking-tight ${
                  count === 0
                    ? 'text-zinc-700'
                    : isToday
                      ? 'text-accent'
                      : 'text-zinc-500'
                }`}
              >
                {densityDots(count)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

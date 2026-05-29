'use client'

import {
  buildWeek,
  type CalendarEventLite,
  dayLetter,
} from '@/lib/calendarFormat'
import DayCell from './DayCell'

interface Props {
  weekStart: string // iso of Monday
  todayIso: string
  eventsByDay: Map<string, CalendarEventLite[]>
  onSelectDay: (iso: string) => void
}

export default function WeekGrid({
  weekStart,
  todayIso,
  eventsByDay,
  onSelectDay,
}: Props) {
  const days = buildWeek(weekStart)

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-7 gap-1">
        {days.map((iso) => (
          <span
            key={iso}
            className="text-[10px] text-zinc-600 tracking-widest text-center py-1"
          >
            {dayLetter(iso)}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((iso) => (
          <DayCell
            key={iso}
            iso={iso}
            events={eventsByDay.get(iso) ?? []}
            isToday={iso === todayIso}
            maxChips={5}
            variant="week"
            onClick={onSelectDay}
          />
        ))}
      </div>
    </div>
  )
}

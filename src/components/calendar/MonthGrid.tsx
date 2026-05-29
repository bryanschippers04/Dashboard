'use client'

import {
  type CalendarEventLite,
  isSameMonth,
  monthGridWindow,
} from '@/lib/calendarFormat'
import DayCell from './DayCell'

interface Props {
  monthIso: string // any iso within the focused month
  todayIso: string
  eventsByDay: Map<string, CalendarEventLite[]>
  onSelectDay: (iso: string) => void
}

const DAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function MonthGrid({
  monthIso,
  todayIso,
  eventsByDay,
  onSelectDay,
}: Props) {
  const cells = monthGridWindow(monthIso)

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-7 gap-1">
        {DAY_HEADERS.map((d, i) => (
          <span
            key={i}
            className="text-[10px] text-zinc-600 tracking-widest text-center py-1"
          >
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((iso) => (
          <DayCell
            key={iso}
            iso={iso}
            events={eventsByDay.get(iso) ?? []}
            isToday={iso === todayIso}
            isOutOfMonth={!isSameMonth(iso, monthIso)}
            maxChips={3}
            variant="month"
            onClick={onSelectDay}
          />
        ))}
      </div>
    </div>
  )
}

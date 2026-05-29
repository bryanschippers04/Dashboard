'use client'

import type { CalendarEventLite } from '@/lib/calendarFormat'
import EventChip from './EventChip'

interface Props {
  iso: string
  events: CalendarEventLite[]
  isToday: boolean
  isOutOfMonth?: boolean
  maxChips: number
  variant: 'month' | 'week'
  onClick: (iso: string) => void
}

export default function DayCell({
  iso,
  events,
  isToday,
  isOutOfMonth = false,
  maxChips,
  variant,
  onClick,
}: Props) {
  const dayNum = String(Number(iso.slice(8, 10))).padStart(2, '0')
  const shown = events.slice(0, maxChips)
  const overflow = events.length - shown.length

  // Month cells are shorter than wide on desktop so the whole grid fits
  // on screen without scrolling. Mobile keeps a portrait orientation so
  // chips don't get crushed.
  const heightCls =
    variant === 'month'
      ? 'h-[72px] sm:h-[84px] md:h-[92px]'
      : 'min-h-[180px] md:min-h-[220px]'

  const borderCls = isToday
    ? 'border-accent'
    : 'border-slate-800 hover:border-slate-700'

  return (
    <button
      type="button"
      onClick={() => onClick(iso)}
      className={`relative flex flex-col gap-1 border bg-[#0a1830] p-1.5 text-left transition-colors ${heightCls} ${borderCls} ${
        isOutOfMonth ? 'opacity-40' : ''
      }`}
    >
      <span
        className={`text-[10px] tabular-nums tracking-wider ${
          isToday
            ? 'text-accent ring-1 ring-accent/50 px-1 -ml-0.5 self-start'
            : 'text-zinc-400'
        }`}
      >
        {dayNum}
      </span>
      <div className="flex flex-col gap-0.5 min-w-0 w-full">
        {shown.map((e) => (
          <EventChip key={e.id} event={e} compact={variant === 'month'} />
        ))}
        {overflow > 0 && (
          <span className="text-[9px] text-zinc-600 tracking-wider tabular-nums pl-1">
            + {overflow} MORE
          </span>
        )}
      </div>
    </button>
  )
}

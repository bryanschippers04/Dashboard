import type { CalendarEventLite } from '@/lib/calendarFormat'

interface Props {
  event: CalendarEventLite
  compact?: boolean // smaller text on mobile / month view
}

export default function EventChip({ event, compact = false }: Props) {
  const title = event.summary ?? '(no title)'
  const sizeCls = compact ? 'text-[9px] sm:text-[10px]' : 'text-[10px]'

  if (event.all_day) {
    return (
      <span
        className={`block bg-accent/15 text-accent ${sizeCls} tracking-wider truncate px-1 py-px`}
      >
        {title}
      </span>
    )
  }
  return (
    <span
      className={`block border-l-2 border-accent text-zinc-200 ${sizeCls} truncate pl-1 py-px`}
    >
      {title}
    </span>
  )
}

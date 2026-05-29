'use client'

import { useEffect, useRef } from 'react'
import {
  type CalendarEventLite,
  eventTimeLabel,
  formatFullDate,
} from '@/lib/calendarFormat'

interface Props {
  iso: string | null
  events: CalendarEventLite[]
  onClose: () => void
}

export default function DayDetailModal({ iso, events, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dlg = dialogRef.current
    if (!dlg) return
    if (iso) {
      if (!dlg.open) dlg.showModal()
    } else {
      if (dlg.open) dlg.close()
    }
  }, [iso])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    // Native <dialog> backdrop clicks bubble with target === dialog element.
    if (e.target === dialogRef.current) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={handleBackdropClick}
      className="bg-[#0a1830] border border-slate-700 text-zinc-100 max-w-md w-[90vw] max-h-[80vh] p-0 backdrop:bg-black/70"
    >
      {iso && (
        <div className="flex flex-col max-h-[80vh]">
          <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <span className="text-[10px] text-accent tracking-[0.2em]">
              {formatFullDate(iso)}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-500 hover:text-accent text-base w-6 h-6 flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              ×
            </button>
          </header>
          <div className="overflow-y-auto p-4">
            {events.length === 0 ? (
              <p className="text-xs text-zinc-500">Nothing scheduled.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {events.map((e) => (
                  <EventDetail key={e.id} event={e} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </dialog>
  )
}

function EventDetail({ event }: { event: CalendarEventLite }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-16 shrink-0 text-[10px] text-accent tracking-wider tabular-nums pt-0.5">
        {eventTimeLabel(event)}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-zinc-100 leading-snug">
          {event.summary ?? '(no title)'}
        </p>
        {event.location && (
          <p className="text-[10px] text-zinc-500 mt-1 leading-snug">
            {event.location}
          </p>
        )}
        {event.description && (
          <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed whitespace-pre-line line-clamp-6">
            {event.description}
          </p>
        )}
      </div>
    </div>
  )
}

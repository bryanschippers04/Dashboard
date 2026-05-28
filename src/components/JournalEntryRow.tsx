'use client'

import { useState } from 'react'

export interface JournalEntry {
  id: string
  text: string
  text_compact: string | null
  timestamp: string
  rating: number | null
  mood_tags: string[] | null
  sleep_minutes: number | null
  energy: number | null
  productivity: number | null
  exercise: string | null
  time_outside: string | null
  phone_time_minutes: number | null
}

function formatSleep(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h}h`
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

export default function JournalEntryRow({ entry }: { entry: JournalEntry }) {
  const [expanded, setExpanded] = useState(false)
  const bullets = entry.text_compact
    ? entry.text_compact.split('\n').map((s) => s.trim()).filter(Boolean)
    : null
  const hasRaw = entry.text && entry.text.trim().length > 0
  const canExpand = bullets !== null && hasRaw

  return (
    <div className="border border-slate-800 bg-[#0a1830] p-4 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {bullets ? (
            <ul className="space-y-1">
              {bullets.map((b, i) => (
                <li
                  key={i}
                  className="text-xs text-zinc-300 leading-relaxed flex gap-2"
                >
                  <span className="text-zinc-700 shrink-0">›</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2">
              {entry.text}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          {entry.rating !== null && (
            <p className="text-xs text-accent tabular-nums">{entry.rating}/10</p>
          )}
          <p className="text-[10px] text-zinc-600 mt-0.5">
            {new Date(entry.timestamp).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: '2-digit',
            })}
          </p>
        </div>
      </div>

      {(entry.sleep_minutes !== null ||
        entry.energy !== null ||
        entry.productivity !== null ||
        entry.exercise ||
        entry.time_outside ||
        entry.phone_time_minutes !== null) && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px] text-zinc-500 tabular-nums">
          {entry.sleep_minutes !== null && (
            <span>
              <span className="text-zinc-700">SLEEP</span>{' '}
              {formatSleep(entry.sleep_minutes)}
            </span>
          )}
          {entry.energy !== null && (
            <span>
              <span className="text-zinc-700">E</span> {entry.energy}/10
            </span>
          )}
          {entry.productivity !== null && (
            <span>
              <span className="text-zinc-700">P</span> {entry.productivity}/10
            </span>
          )}
          {entry.phone_time_minutes !== null && (
            <span>
              <span className="text-zinc-700">PHONE</span>{' '}
              {formatSleep(entry.phone_time_minutes)}
            </span>
          )}
          {entry.time_outside && (
            <span>
              <span className="text-zinc-700">OUTSIDE</span> {entry.time_outside}
            </span>
          )}
          {entry.exercise && (
            <span className="basis-full text-zinc-400">
              <span className="text-zinc-700">EXERCISE</span> {entry.exercise}
            </span>
          )}
        </div>
      )}

      {entry.mood_tags && entry.mood_tags.length > 0 && (
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {entry.mood_tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] text-zinc-600 bg-slate-800/50 px-2 py-0.5 tracking-wider"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {canExpand && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-[10px] text-zinc-700 hover:text-zinc-400 active:text-zinc-400 tracking-widest transition-colors py-2 -my-2 px-1 -mx-1"
          >
            {expanded ? '− HIDE RAW' : '+ SHOW RAW'}
          </button>
          {expanded && (
            <p className="mt-2 text-[11px] text-zinc-500 leading-relaxed whitespace-pre-wrap border-l-2 border-slate-800 pl-3">
              {entry.text}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

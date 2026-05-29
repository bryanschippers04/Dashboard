'use client'

import { useEffect, useState, useTransition } from 'react'
import { Check, Minus, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Cadence } from '@/lib/habits'

export interface HabitRowData {
  id: string
  title: string
  cadence: Cadence
  target_count: number
  current_count: number
  hit_target: boolean
  streak: number
}

export default function HabitRow({
  habit,
  compact = false,
}: {
  habit: HabitRowData
  compact?: boolean
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [, startTransition] = useTransition()

  // Mirror server state locally so tick/untick can flip the checkbox
  // instantly. Resync whenever the server props change (after refresh).
  const [localCount, setLocalCount] = useState(habit.current_count)
  useEffect(() => {
    setLocalCount(habit.current_count)
  }, [habit.current_count])

  const isBinary = habit.target_count === 1
  const hit = localCount >= habit.target_count

  function refreshSoon() {
    startTransition(() => router.refresh())
  }

  function tick() {
    setLocalCount((c) => c + 1)
    fetch(`/api/habits/${habit.id}/tick`, { method: 'POST' }).then(refreshSoon)
  }

  function untick() {
    setLocalCount((c) => Math.max(0, c - 1))
    fetch(`/api/habits/${habit.id}/tick`, { method: 'DELETE' }).then(refreshSoon)
  }

  async function remove() {
    if (!confirm(`Delete habit "${habit.title}"?`)) return
    setDeleting(true)
    await fetch(`/api/habits/${habit.id}`, { method: 'DELETE' })
    setDeleting(false)
    refreshSoon()
  }

  return (
    <li
      className={`flex items-center gap-2 border border-slate-800 bg-[#0a1830] pl-1 pr-2 transition-opacity ${
        deleting ? 'opacity-50' : ''
      }`}
    >
      {isBinary ? (
        <button
          type="button"
          onClick={hit ? untick : tick}
          className="shrink-0 w-11 h-11 flex items-center justify-center"
          aria-label={hit ? 'Untick' : 'Tick'}
        >
          <span
            className={`w-5 h-5 border flex items-center justify-center transition-colors ${
              hit
                ? 'bg-accent border-accent'
                : 'border-slate-500'
            }`}
          >
            {hit && (
              <Check size={12} className="text-[#050d1c]" strokeWidth={3} />
            )}
          </span>
        </button>
      ) : (
        <div className="shrink-0 pl-2 flex items-center gap-1">
          <button
            type="button"
            onClick={untick}
            disabled={localCount === 0}
            className="w-9 h-9 border border-slate-700 text-zinc-400 hover:border-accent hover:text-accent active:border-accent active:text-accent disabled:opacity-30 disabled:hover:border-slate-700 disabled:hover:text-zinc-400 transition-colors flex items-center justify-center"
            aria-label="Untick"
          >
            <Minus size={13} />
          </button>
          <button
            type="button"
            onClick={tick}
            className="w-9 h-9 border border-slate-700 text-zinc-400 hover:border-accent hover:text-accent active:border-accent active:text-accent disabled:opacity-30 transition-colors flex items-center justify-center"
            aria-label="Tick"
          >
            <Plus size={13} />
          </button>
        </div>
      )}

      <div className="flex-1 min-w-0 py-2.5">
        <p
          className={`text-sm transition-colors truncate ${
            hit ? 'text-zinc-300' : 'text-zinc-200'
          }`}
        >
          {habit.title}
        </p>
        {!compact && !isBinary && (
          <p className="text-[10px] text-zinc-600 tracking-wider tabular-nums mt-0.5">
            {localCount}/{habit.target_count}
          </p>
        )}
      </div>

      {!isBinary && compact && (
        <span className="shrink-0 text-[11px] text-zinc-400 tabular-nums">
          {localCount}/{habit.target_count}
        </span>
      )}

      {habit.streak >= 2 && (
        <span className="shrink-0 text-[10px] text-amber-400/80 tracking-wider tabular-nums">
          🔥 {habit.streak}
        </span>
      )}

      <button
        type="button"
        onClick={remove}
        disabled={deleting}
        className="shrink-0 w-9 h-9 flex items-center justify-center text-zinc-600 hover:text-red-400 active:text-red-400 transition-colors"
        aria-label="Delete habit"
      >
        <Trash2 size={12} />
      </button>
    </li>
  )
}

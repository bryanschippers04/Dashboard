'use client'

import { useState, useTransition } from 'react'
import { Minus, Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export interface Goal {
  id: string
  title: string
  type: 'daily' | 'weekly' | 'monthly'
  target: number
  current_progress: number
}

export default function GoalList({ goals }: { goals: Goal[] }) {
  const router = useRouter()
  const [override, setOverride] = useState<Map<string, number>>(new Map())
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()

  function setPending(id: string, on: boolean) {
    setPendingIds((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function clearOverride(id: string) {
    setOverride((prev) => {
      if (!prev.has(id)) return prev
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }

  async function bump(goal: Goal, delta: number) {
    const current = override.get(goal.id) ?? goal.current_progress
    const next = Math.max(0, current + delta)
    if (next === current) return

    setOverride((prev) => new Map(prev).set(goal.id, next))
    setPending(goal.id, true)

    const supabase = createClient()
    await supabase.from('goals').update({ current_progress: next }).eq('id', goal.id)
    startTransition(() => router.refresh())
    setPending(goal.id, false)
    clearOverride(goal.id)
  }

  async function remove(id: string) {
    setPending(id, true)
    const supabase = createClient()
    await supabase.from('goals').delete().eq('id', id)
    startTransition(() => router.refresh())
    setPending(id, false)
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {goals.map((goal) => {
        const displayed = override.get(goal.id) ?? goal.current_progress
        const isPending = pendingIds.has(goal.id)
        const achieved = displayed >= goal.target
        const pct = goal.target > 0 ? (displayed / goal.target) * 100 : 0
        const cappedPct = Math.min(100, pct)

        return (
          <li
            key={goal.id}
            className={`group border border-slate-800 bg-[#0a1830] px-3 py-2.5 transition-opacity ${
              isPending ? 'opacity-80' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="flex-1 text-sm text-zinc-200 truncate">{goal.title}</span>
              <span
                className={`text-[11px] tabular-nums tracking-wider ${
                  achieved ? 'text-emerald-400' : 'text-zinc-400'
                }`}
              >
                {displayed}/{goal.target}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => bump(goal, -1)}
                  disabled={isPending || displayed === 0}
                  className="w-9 h-9 border border-slate-700 text-zinc-400 hover:border-accent hover:text-accent active:border-accent active:text-accent transition-colors disabled:opacity-30 disabled:hover:border-slate-700 disabled:hover:text-zinc-400 flex items-center justify-center"
                  aria-label="Decrement progress"
                >
                  <Minus size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => bump(goal, 1)}
                  disabled={isPending}
                  className="w-9 h-9 border border-slate-700 text-zinc-400 hover:border-accent hover:text-accent active:border-accent active:text-accent transition-colors disabled:opacity-30 flex items-center justify-center"
                  aria-label="Increment progress"
                >
                  <Plus size={13} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => remove(goal.id)}
                disabled={isPending}
                className="shrink-0 w-9 h-9 flex items-center justify-center text-zinc-600 hover:text-red-400 active:text-red-400 transition-colors"
                aria-label="Delete goal"
              >
                <X size={14} />
              </button>
            </div>
            <div className="mt-2 h-0.5 bg-slate-800 relative overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-accent transition-all duration-300"
                style={{ width: `${cappedPct}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

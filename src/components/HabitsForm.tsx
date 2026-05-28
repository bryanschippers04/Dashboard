'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Cadence } from '@/lib/habits'

const CADENCES: { value: Cadence; label: string }[] = [
  { value: 'daily', label: 'DAILY' },
  { value: 'weekly', label: 'WEEKLY' },
  { value: 'monthly', label: 'MONTHLY' },
]

export default function HabitsForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [cadence, setCadence] = useState<Cadence>('daily')
  const [target, setTarget] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    setError('')
    const res = await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        cadence,
        target_count: target,
      }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) {
      setError(data.error || 'Failed')
      return
    }
    setTitle('')
    setTarget(1)
    setCadence('daily')
    router.refresh()
  }

  return (
    <form
      onSubmit={submit}
      className="border border-slate-800 bg-[#0a1830] p-3 flex flex-col gap-2"
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a habit…"
        className="bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none px-2 py-2"
        required
      />
      <div className="flex items-center gap-2 flex-wrap">
        {CADENCES.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setCadence(c.value)}
            className={`text-[10px] tracking-widest px-3 py-2 border transition-colors ${
              cadence === c.value
                ? 'border-accent text-accent bg-accent/10'
                : 'border-slate-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 active:border-zinc-500'
            }`}
          >
            {c.label}
          </button>
        ))}
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-[10px] text-zinc-600 tracking-wider">
            TARGET
          </span>
          <button
            type="button"
            onClick={() => setTarget((t) => Math.max(1, t - 1))}
            className="w-9 h-9 border border-slate-700 text-zinc-400 hover:border-accent hover:text-accent active:border-accent active:text-accent transition-colors flex items-center justify-center"
            aria-label="Decrement target"
          >
            −
          </button>
          <span className="text-xs text-zinc-200 tabular-nums w-6 text-center">
            {target}
          </span>
          <button
            type="button"
            onClick={() => setTarget((t) => t + 1)}
            className="w-9 h-9 border border-slate-700 text-zinc-400 hover:border-accent hover:text-accent active:border-accent active:text-accent transition-colors flex items-center justify-center"
            aria-label="Increment target"
          >
            +
          </button>
        </div>
        <button
          type="submit"
          disabled={!title.trim() || busy}
          className="flex items-center gap-1.5 bg-accent text-[#050d1c] text-[10px] tracking-widest px-4 py-2 font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          <Plus size={11} />
          {busy ? 'ADDING' : 'ADD'}
        </button>
      </div>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </form>
  )
}

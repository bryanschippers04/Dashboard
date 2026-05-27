'use client'

import { useState, useTransition } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { RecurringFrequency } from '@/lib/finance'

export default function VasteLastenAddForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly')
  const [source, setSource] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()

  function reset() {
    setName('')
    setAmount('')
    setFrequency('monthly')
    setSource('')
    setError('')
  }

  async function save() {
    setBusy(true)
    setError('')
    const res = await fetch('/api/finance/recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        amount: Number(amount),
        frequency,
        source,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Save failed')
      setBusy(false)
      return
    }
    reset()
    setOpen(false)
    setBusy(false)
    startTransition(() => router.refresh())
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full mt-3 flex items-center justify-center gap-1.5 text-[10px] tracking-widest text-zinc-500 hover:text-accent border border-slate-800 hover:border-accent/60 py-2 transition-colors"
      >
        <Plus size={11} /> ADD MANUAL
      </button>
    )
  }

  const canSave = name.trim().length > 0 && Number(amount) > 0

  return (
    <div className="mt-3 border border-accent/40 bg-[#0a1830] p-2">
      <div className="flex flex-col gap-1.5">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Netflix"
          className="bg-[#050d1c] border border-slate-700 text-xs text-zinc-200 px-2 py-1 focus:outline-none focus:border-slate-500"
          autoFocus
        />
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            step={0.01}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="amount"
            className="flex-1 bg-[#050d1c] border border-slate-700 text-xs text-zinc-200 px-2 py-1 focus:outline-none focus:border-slate-500 tabular-nums"
          />
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
            className="bg-[#050d1c] border border-slate-700 text-[10px] text-zinc-300 px-1 py-1 focus:outline-none focus:border-slate-500 tracking-wider"
          >
            <option value="weekly">WKLY</option>
            <option value="monthly">MTHLY</option>
            <option value="quarterly">QTRLY</option>
            <option value="yearly">YRLY</option>
          </select>
        </div>
        <input
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="source (e.g. Revolut)"
          className="bg-[#050d1c] border border-slate-700 text-xs text-zinc-300 px-2 py-1 focus:outline-none focus:border-slate-500"
        />
        <div className="flex items-center gap-1 justify-end">
          <button
            type="button"
            onClick={save}
            disabled={busy || !canSave}
            className="w-6 h-6 border border-accent text-accent hover:bg-accent/10 transition-colors disabled:opacity-40 flex items-center justify-center"
            aria-label="Save"
          >
            <Check size={12} />
          </button>
          <button
            type="button"
            onClick={() => {
              reset()
              setOpen(false)
            }}
            disabled={busy}
            className="w-6 h-6 border border-slate-700 text-zinc-500 hover:border-red-400 hover:text-red-400 transition-colors flex items-center justify-center"
            aria-label="Cancel"
          >
            <X size={12} />
          </button>
        </div>
        {error && <p className="text-[10px] text-red-400">{error}</p>}
      </div>
    </div>
  )
}

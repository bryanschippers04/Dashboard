'use client'

import { useState, useTransition } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { RecurringFrequency } from '@/lib/finance'

export interface RecurringEntry {
  id: string
  name: string
  amount: number
  frequency: RecurringFrequency
  source: string | null
}

const FREQ_BADGE: Record<RecurringFrequency, string> = {
  weekly: 'WKLY',
  monthly: 'MTHLY',
  quarterly: 'QTRLY',
  yearly: 'YRLY',
}

function fmt(n: number): string {
  return `€ ${n.toLocaleString('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export default function VasteLastenRow({ entry }: { entry: RecurringEntry }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [, startTransition] = useTransition()

  if (editing) {
    return (
      <EditForm
        entry={entry}
        onCancel={() => setEditing(false)}
        onSaved={() => {
          setEditing(false)
          startTransition(() => router.refresh())
        }}
      />
    )
  }

  return (
    <ViewRow
      entry={entry}
      onEdit={() => setEditing(true)}
      onDeleted={() => startTransition(() => router.refresh())}
    />
  )
}

function ViewRow({
  entry,
  onEdit,
  onDeleted,
}: {
  entry: RecurringEntry
  onEdit: () => void
  onDeleted: () => void
}) {
  const [busy, setBusy] = useState(false)

  async function remove() {
    if (!confirm(`Delete "${entry.name}"?`)) return
    setBusy(true)
    await fetch(`/api/finance/recurring?id=${encodeURIComponent(entry.id)}`, {
      method: 'DELETE',
    })
    setBusy(false)
    onDeleted()
  }

  return (
    <div className="group flex items-center gap-2 py-1.5 border-b border-slate-800 last:border-b-0">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-zinc-200 truncate">{entry.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[9px] tracking-wider text-zinc-500 border border-slate-800 px-1 py-px">
            {FREQ_BADGE[entry.frequency]}
          </span>
          {entry.source && (
            <span className="text-[9px] tracking-wider text-zinc-500 border border-slate-800 px-1 py-px">
              {entry.source.toUpperCase()}
            </span>
          )}
          <span className="text-[9px] tracking-wider text-zinc-700">MANUAL</span>
        </div>
      </div>
      <span className="text-xs text-zinc-200 tabular-nums shrink-0">
        {fmt(entry.amount)}
      </span>
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={onEdit}
          disabled={busy}
          className="w-5 h-5 text-zinc-600 hover:text-accent transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
          aria-label="Edit"
        >
          <Pencil size={10} />
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="w-5 h-5 text-zinc-600 hover:text-red-400 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
          aria-label="Delete"
        >
          <X size={11} />
        </button>
      </div>
    </div>
  )
}

function EditForm({
  entry,
  onCancel,
  onSaved,
}: {
  entry: RecurringEntry
  onCancel: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(entry.name)
  const [amount, setAmount] = useState(String(entry.amount))
  const [frequency, setFrequency] = useState<RecurringFrequency>(entry.frequency)
  const [source, setSource] = useState(entry.source ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setBusy(true)
    setError('')
    const res = await fetch('/api/finance/recurring', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: entry.id,
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
    setBusy(false)
    onSaved()
  }

  const canSave = name.trim().length > 0 && Number(amount) > 0

  return (
    <div className="border border-accent/40 bg-[#0a1830] p-2 mb-1.5">
      <div className="flex flex-col gap-1.5">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="bg-[#050d1c] border border-slate-700 text-xs text-zinc-200 px-2 py-1 focus:outline-none focus:border-slate-500"
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
            onClick={onCancel}
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

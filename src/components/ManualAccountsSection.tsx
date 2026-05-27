'use client'

import { useState, useTransition } from 'react'
import { Check, Pencil, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

export interface ManualAccount {
  id: string
  name: string
  iban: string | null
  balance: number
  currency: string | null
}

function fmt(n: number): string {
  return `€ ${n.toLocaleString('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export default function ManualAccountsSection({ accounts }: { accounts: ManualAccount[] }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function refresh() {
    startTransition(() => router.refresh())
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase">
          Other accounts
        </p>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-[10px] text-zinc-600 hover:text-accent tracking-widest transition-colors flex items-center gap-1"
        >
          <Plus size={10} /> ADD
        </button>
      </div>

      {accounts.length === 0 && !adding && (
        <p className="text-xs text-zinc-700 py-2">
          Track cash, savings, or investments you maintain manually.
        </p>
      )}

      <ul className="flex flex-col gap-1.5">
        {accounts.map((a) =>
          editingId === a.id ? (
            <EditRow
              key={a.id}
              account={a}
              onCancel={() => setEditingId(null)}
              onSaved={() => {
                setEditingId(null)
                refresh()
              }}
            />
          ) : (
            <ViewRow
              key={a.id}
              account={a}
              onEdit={() => setEditingId(a.id)}
              onDeleted={refresh}
            />
          )
        )}
      </ul>

      {adding && (
        <AddRow
          onCancel={() => setAdding(false)}
          onSaved={() => {
            setAdding(false)
            refresh()
          }}
        />
      )}
    </div>
  )
}

function ViewRow({
  account,
  onEdit,
  onDeleted,
}: {
  account: ManualAccount
  onEdit: () => void
  onDeleted: () => void
}) {
  const [busy, setBusy] = useState(false)

  async function remove() {
    if (!confirm(`Delete "${account.name}"? This cannot be undone.`)) return
    setBusy(true)
    await fetch(`/api/finance/manual-accounts?id=${encodeURIComponent(account.id)}`, {
      method: 'DELETE',
    })
    setBusy(false)
    onDeleted()
  }

  return (
    <li className="group flex items-center gap-3 border border-slate-800 bg-[#0a1830] px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-200 truncate">{account.name}</p>
        {account.iban && (
          <p className="text-[10px] text-zinc-600 tabular-nums tracking-wider">
            {account.iban.replace(/(.{4})/g, '$1 ').trim()}
          </p>
        )}
      </div>
      <span className="text-sm text-zinc-100 tabular-nums shrink-0">
        {fmt(account.balance)}
      </span>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onEdit}
          disabled={busy}
          className="w-6 h-6 border border-slate-700 text-zinc-400 hover:border-accent hover:text-accent transition-colors flex items-center justify-center"
          aria-label="Edit account"
        >
          <Pencil size={11} />
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-700 hover:text-red-400"
          aria-label="Delete account"
        >
          <X size={12} />
        </button>
      </div>
    </li>
  )
}

function EditRow({
  account,
  onCancel,
  onSaved,
}: {
  account: ManualAccount
  onCancel: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(account.name)
  const [iban, setIban] = useState(account.iban ?? '')
  const [balance, setBalance] = useState(String(account.balance))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setBusy(true)
    setError('')
    const res = await fetch('/api/finance/manual-accounts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: account.id, name, iban, balance: Number(balance) }),
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

  return (
    <li className="border border-accent/40 bg-[#0a1830] px-3 py-2.5">
      <div className="flex flex-col sm:flex-row gap-2 items-stretch">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="flex-1 bg-[#050d1c] border border-slate-700 text-sm text-zinc-200 px-2 py-1.5 focus:outline-none focus:border-slate-500"
        />
        <input
          type="text"
          value={iban}
          onChange={(e) => setIban(e.target.value)}
          placeholder="IBAN (optional)"
          className="w-full sm:w-44 bg-[#050d1c] border border-slate-700 text-xs text-zinc-300 px-2 py-1.5 focus:outline-none focus:border-slate-500 tabular-nums"
        />
        <input
          type="number"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="balance"
          step={0.01}
          className="w-full sm:w-32 bg-[#050d1c] border border-slate-700 text-sm text-zinc-200 px-2 py-1.5 focus:outline-none focus:border-slate-500 tabular-nums text-right"
        />
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={save}
            disabled={busy || !name.trim() || !Number.isFinite(Number(balance))}
            className="w-7 h-7 border border-accent text-accent hover:bg-accent/10 transition-colors disabled:opacity-40 flex items-center justify-center"
            aria-label="Save"
          >
            <Check size={12} />
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="w-7 h-7 border border-slate-700 text-zinc-500 hover:border-red-400 hover:text-red-400 transition-colors flex items-center justify-center"
            aria-label="Cancel"
          >
            <X size={12} />
          </button>
        </div>
      </div>
      {error && <p className="text-[11px] text-red-400 mt-2">{error}</p>}
    </li>
  )
}

function AddRow({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [iban, setIban] = useState('')
  const [balance, setBalance] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setBusy(true)
    setError('')
    const res = await fetch('/api/finance/manual-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, iban, balance: Number(balance) }),
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

  return (
    <div className="mt-2 border border-accent/40 bg-[#0a1830] px-3 py-2.5">
      <div className="flex flex-col sm:flex-row gap-2 items-stretch">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Vrij spaargeld"
          className="flex-1 bg-[#050d1c] border border-slate-700 text-sm text-zinc-200 px-2 py-1.5 focus:outline-none focus:border-slate-500"
          autoFocus
        />
        <input
          type="text"
          value={iban}
          onChange={(e) => setIban(e.target.value)}
          placeholder="IBAN (optional)"
          className="w-full sm:w-44 bg-[#050d1c] border border-slate-700 text-xs text-zinc-300 px-2 py-1.5 focus:outline-none focus:border-slate-500 tabular-nums"
        />
        <input
          type="number"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="balance"
          step={0.01}
          className="w-full sm:w-32 bg-[#050d1c] border border-slate-700 text-sm text-zinc-200 px-2 py-1.5 focus:outline-none focus:border-slate-500 tabular-nums text-right"
        />
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={save}
            disabled={busy || !name.trim() || !Number.isFinite(Number(balance))}
            className="w-7 h-7 border border-accent text-accent hover:bg-accent/10 transition-colors disabled:opacity-40 flex items-center justify-center"
            aria-label="Save"
          >
            <Check size={12} />
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="w-7 h-7 border border-slate-700 text-zinc-500 hover:border-red-400 hover:text-red-400 transition-colors flex items-center justify-center"
            aria-label="Cancel"
          >
            <X size={12} />
          </button>
        </div>
      </div>
      {error && <p className="text-[11px] text-red-400 mt-2">{error}</p>}
    </div>
  )
}

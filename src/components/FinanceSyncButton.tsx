'use client'

import { useState, useTransition } from 'react'
import { RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function FinanceSyncButton({ lastSyncedAt }: { lastSyncedAt: string | null }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()

  async function sync() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/finance/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Sync failed')
        setBusy(false)
        return
      }
      startTransition(() => router.refresh())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {lastSyncedAt && (
        <span className="text-[10px] text-zinc-600 tracking-wider">
          LAST SYNCED {new Date(lastSyncedAt).toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      )}
      <button
        type="button"
        onClick={sync}
        disabled={busy}
        className="flex items-center gap-1.5 text-[10px] tracking-widest px-3 py-1.5 border border-slate-700 text-zinc-400 hover:border-accent hover:text-accent transition-colors disabled:opacity-40"
      >
        <RefreshCw size={10} className={busy ? 'animate-spin' : ''} />
        {busy ? 'SYNCING' : 'SYNC NOW'}
      </button>
      {error && <span className="text-[11px] text-red-400">{error}</span>}
    </div>
  )
}

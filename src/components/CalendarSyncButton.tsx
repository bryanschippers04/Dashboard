'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export default function CalendarSyncButton({
  lastSyncedAt,
}: {
  lastSyncedAt: string | null
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()

  async function run() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/calendar/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Sync failed')
        return
      }
      startTransition(() => router.refresh())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="border border-accent text-accent text-[10px] tracking-[0.2em] px-3 py-2.5 hover:bg-accent/10 active:bg-accent/10 transition-colors disabled:opacity-40"
      >
        {busy ? 'SYNCING…' : '↻ SYNC NOW'}
      </button>
      {lastSyncedAt && (
        <p className="text-[10px] text-zinc-600 tracking-wider">
          Last sync{' '}
          {new Date(lastSyncedAt).toLocaleString('nl-NL', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      )}
      {error && <p className="text-[10px] text-red-400">{error}</p>}
    </div>
  )
}

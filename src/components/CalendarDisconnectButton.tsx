'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export default function CalendarDisconnectButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [, startTransition] = useTransition()

  async function run() {
    if (!confirm('Disconnect Google Calendar? Cached events will be cleared.')) return
    setBusy(true)
    await fetch('/api/calendar/disconnect', { method: 'DELETE' })
    setBusy(false)
    startTransition(() => router.refresh())
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className="text-[10px] tracking-widest text-zinc-600 hover:text-red-400 active:text-red-400 transition-colors px-2 py-2.5"
    >
      {busy ? 'DISCONNECTING…' : 'DISCONNECT'}
    </button>
  )
}

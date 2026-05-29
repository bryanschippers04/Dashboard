'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export type InsightKind = 'weekly' | 'daily'

const CONFIG: Record<
  InsightKind,
  { endpoint: string; label: string; busyLabel: string }
> = {
  weekly: {
    endpoint: '/api/insights/run',
    label: '+ WEEKLY (LAST MON–SUN)',
    busyLabel: 'GENERATING WEEK…',
  },
  daily: {
    endpoint: '/api/insights/daily',
    label: '+ DAILY (YESTERDAY)',
    busyLabel: 'GENERATING DAY…',
  },
}

export default function GenerateInsightsButton({
  kind = 'weekly',
  label,
  successView,
}: {
  kind?: InsightKind
  label?: string
  successView?: 'weekly' | 'daily'
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()

  const cfg = CONFIG[kind]

  async function run() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(cfg.endpoint, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed')
        setBusy(false)
        return
      }
      if (successView) router.push(`/insights?view=${successView}`)
      startTransition(() => router.refresh())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="border border-accent text-accent text-[10px] tracking-[0.2em] px-3 py-2 hover:bg-accent/10 transition-colors disabled:opacity-40"
      >
        {busy ? cfg.busyLabel : (label ?? cfg.label)}
      </button>
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  )
}

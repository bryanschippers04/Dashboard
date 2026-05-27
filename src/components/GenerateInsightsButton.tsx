'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export default function GenerateInsightsButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()

  async function run() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/insights/run', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed')
        setBusy(false)
        return
      }
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
        {busy ? 'GENERATING…' : '+ GENERATE LAST WEEK'}
      </button>
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  )
}

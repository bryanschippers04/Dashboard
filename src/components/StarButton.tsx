'use client'

import { useState, useTransition } from 'react'
import { Star } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function StarButton({
  id,
  starred,
}: {
  id: string
  starred: boolean
}) {
  const router = useRouter()
  const [optimistic, setOptimistic] = useState(starred)
  const [busy, setBusy] = useState(false)
  const [, startTransition] = useTransition()

  async function toggle() {
    const next = !optimistic
    setOptimistic(next)
    setBusy(true)
    try {
      const res = await fetch(`/api/insights/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_starred: next }),
      })
      if (!res.ok) {
        setOptimistic(!next)
      } else {
        startTransition(() => router.refresh())
      }
    } catch {
      setOptimistic(!next)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={optimistic ? 'Unstar' : 'Star'}
      className={`w-5 h-5 flex items-center justify-center transition-colors ${
        optimistic
          ? 'text-amber-400 hover:text-amber-300'
          : 'text-zinc-700 hover:text-zinc-400'
      }`}
    >
      <Star
        size={12}
        fill={optimistic ? 'currentColor' : 'none'}
        strokeWidth={1.6}
      />
    </button>
  )
}

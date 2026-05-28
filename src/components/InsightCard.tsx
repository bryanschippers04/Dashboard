'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import StarButton from './StarButton'

export interface InsightCardRow {
  id: string
  insight_type: string
  title: string | null
  body: string | null
  content: string | null
  verse: { ref?: string; text?: string } | null
  scope?: string | null
  day?: string | null
  is_starred?: boolean | null
}

const TYPE_STYLES: Record<string, { label: string; color: string }> = {
  pattern: { label: 'PATTERN', color: 'text-accent' },
  action: { label: 'ACTION', color: 'text-amber-400' },
  win: { label: 'WIN', color: 'text-emerald-400' },
  warning: { label: 'WARNING', color: 'text-red-400' },
}

export default function InsightCard({
  row,
  compact = false,
}: {
  row: InsightCardRow
  compact?: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [, startTransition] = useTransition()

  const style = TYPE_STYLES[row.insight_type] ?? {
    label: row.insight_type.toUpperCase(),
    color: 'text-zinc-400',
  }
  const title = row.title ?? row.content?.split('\n')[0] ?? ''
  const body =
    row.body ?? (row.title ? '' : row.content?.split('\n').slice(1).join('\n') ?? '')

  async function remove() {
    if (!confirm('Delete this insight?')) return
    setBusy(true)
    const res = await fetch(`/api/insights/${row.id}`, { method: 'DELETE' })
    setBusy(false)
    if (res.ok) startTransition(() => router.refresh())
  }

  return (
    <div
      className={`group border border-slate-800 bg-[#0a1830] ${
        compact ? 'p-3' : 'p-4'
      } hover:border-slate-700 transition-colors`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] tracking-[0.2em] ${style.color}`}>
            {style.label}
          </span>
          {row.scope === 'daily' && row.day && (
            <span className="text-[10px] text-zinc-600 tracking-wider">
              {formatDay(row.day)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <StarButton id={row.id} starred={!!row.is_starred} />
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            aria-label="Delete"
            className="w-9 h-9 -m-2 flex items-center justify-center text-zinc-600 hover:text-red-400 active:text-red-400 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      {title && (
        <p
          className={`text-zinc-100 leading-snug mb-1 ${
            compact ? 'text-xs' : 'text-sm'
          }`}
        >
          {title}
        </p>
      )}
      {body && (
        <p
          className={`text-zinc-400 leading-relaxed whitespace-pre-wrap ${
            compact ? 'text-[11px]' : 'text-xs'
          }`}
        >
          {body}
        </p>
      )}
      {row.verse?.ref && row.verse?.text && (
        <div className="mt-3 border-l-2 border-slate-700 pl-3">
          <p className="text-[10px] text-zinc-500 tracking-wider mb-0.5">
            {row.verse.ref}
          </p>
          <p className="text-xs text-zinc-400 italic leading-relaxed">
            {row.verse.text}
          </p>
        </div>
      )}
    </div>
  )
}

function formatDay(day: string): string {
  const d = new Date(day + 'T00:00:00Z')
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  })
}

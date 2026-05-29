'use client'

import { useMemo, useState } from 'react'
import type { Category } from '@/lib/categorize'

// Capture "now" once at mount so re-renders triggered by range
// changes (or React 19's strict purity rules) don't observe a
// moving cutoff. The breakdown is a snapshot, not a ticker.
function useToday(): string {
  const [today] = useState(() => isoDate(new Date()))
  return today
}

interface TxForBreakdown {
  amount: number
  category: string | null
  date: string
}

const LABEL: Record<Category, string> = {
  groceries: 'Groceries',
  transport: 'Transport',
  'food-out': 'Food out',
  subscriptions: 'Subscriptions',
  shopping: 'Shopping',
  entertainment: 'Entertainment',
  health: 'Health',
  bills: 'Bills',
  income: 'Income',
  transfer: 'Transfer',
  other: 'Other',
}

type RangeKey = '7D' | '30D' | '6M' | '1Y' | 'ALL'

const RANGE_LABEL: Record<RangeKey, string> = {
  '7D': '7d',
  '30D': '30d',
  '6M': '6mo',
  '1Y': '1y',
  ALL: 'all',
}

function daysFor(range: RangeKey): number | null {
  switch (range) {
    case '7D':
      return 7
    case '30D':
      return 30
    case '6M':
      return 182
    case '1Y':
      return 365
    case 'ALL':
      return null
  }
}

function fmt(n: number): string {
  return `€ ${n.toLocaleString('nl-NL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10)

export default function CategoryBreakdown({
  transactions,
}: {
  transactions: TxForBreakdown[]
}) {
  const [range, setRange] = useState<RangeKey>('30D')
  const today = useToday()

  const breakdown = useMemo(() => {
    const days = daysFor(range)
    const cutoff =
      days === null
        ? null
        : isoDate(new Date(new Date(today + 'T00:00:00').getTime() - days * 86400000))

    const map = new Map<Category, number>()
    // `today` is intentionally captured once at mount via useToday();
    // a stale `today` here would only happen across midnight, which
    // is fine for a snapshot tile.
    for (const t of transactions) {
      if (cutoff && t.date < cutoff) continue
      const cat = (t.category as Category) || 'other'
      // Amount is already negative for outflows; use abs for the chart.
      map.set(cat, (map.get(cat) ?? 0) + Math.abs(t.amount))
    }
    return Array.from(map.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
  }, [transactions, range, today])

  const max = Math.max(1, ...breakdown.map((b) => b.total))

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase">
          Category · {RANGE_LABEL[range]}
        </p>
        <div className="flex border border-slate-800 divide-x divide-slate-800">
          {(['7D', '30D', '6M', '1Y', 'ALL'] as RangeKey[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`text-[9px] tracking-widest px-2 py-1 transition-colors ${
                r === range
                  ? 'bg-accent/10 text-accent'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {breakdown.length === 0 ? (
        <p className="text-xs text-zinc-700 py-3">No spending in this range.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {breakdown.map((b) => {
            const pct = (b.total / max) * 100
            return (
              <li key={b.category}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs text-zinc-300 truncate">
                    {LABEL[b.category]}
                  </span>
                  <span className="text-[10px] text-zinc-500 tabular-nums shrink-0">
                    {fmt(b.total)}
                  </span>
                </div>
                <div className="h-0.5 bg-slate-800 relative overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full bg-accent transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { Settings } from 'lucide-react'

interface UsageBreakdownItem {
  endpoint: string
  cost_eur: number
  calls: number
}

interface UsageSummary {
  total_eur: number
  month_eur: number
  week_eur: number
  calls: number
  input_tokens: number
  output_tokens: number
  model: string | null
  by_endpoint: UsageBreakdownItem[]
}

export default function UsageBadge() {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<UsageSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch('/api/usage')
      .then(async (res) => {
        const json = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setError(json.error || 'Failed to load')
          return
        }
        setData(json as UsageSummary)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="API usage"
        onClick={() => setOpen((o) => !o)}
        className={`w-6 h-6 flex items-center justify-center transition-colors ${
          open ? 'text-zinc-200' : 'text-zinc-600 hover:text-zinc-300'
        }`}
      >
        <Settings size={13} />
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-50 w-72 border border-slate-800 bg-[#0a1830] shadow-xl">
          <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
            <p className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase">
              API spend
            </p>
            <p className="text-[10px] text-zinc-700 tracking-wider">
              {data?.model ?? 'ANTHROPIC'}
            </p>
          </div>

          {loading && (
            <p className="px-3 py-3 text-[11px] text-zinc-600">Loading…</p>
          )}
          {error && (
            <p className="px-3 py-3 text-[11px] text-red-400">{error}</p>
          )}

          {data && !loading && !error && (
            <div>
              <Row label="Total" amount={data.total_eur} highlight />
              <Row label="This month" amount={data.month_eur} />
              <Row label="Last 7 days" amount={data.week_eur} />

              <div className="px-3 py-2 border-t border-slate-800">
                <p className="text-[10px] text-zinc-600 tracking-wider mb-2">
                  BY ENDPOINT
                </p>
                {data.by_endpoint.length === 0 ? (
                  <p className="text-[11px] text-zinc-700">
                    No calls recorded yet.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {data.by_endpoint.map((b) => (
                      <div
                        key={b.endpoint}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="text-[10px] text-zinc-500 truncate">
                          {shortEndpoint(b.endpoint)}
                        </span>
                        <span className="text-[10px] text-zinc-400 tabular-nums shrink-0">
                          {formatEur(b.cost_eur)}{' '}
                          <span className="text-zinc-700">· ×{b.calls}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-3 py-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-zinc-600">
                <span>{data.calls} call{data.calls === 1 ? '' : 's'}</span>
                <span className="tabular-nums">
                  {data.input_tokens.toLocaleString()} in ·{' '}
                  {data.output_tokens.toLocaleString()} out
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Row({
  label,
  amount,
  highlight = false,
}: {
  label: string
  amount: number
  highlight?: boolean
}) {
  return (
    <div className="px-3 py-2 flex items-center justify-between border-b border-slate-800 last:border-b-0">
      <span className="text-[11px] text-zinc-500">{label}</span>
      <span
        className={`tabular-nums ${
          highlight ? 'text-sm text-zinc-100' : 'text-[11px] text-zinc-300'
        }`}
      >
        {formatEur(amount)}
      </span>
    </div>
  )
}

function formatEur(amount: number): string {
  // Display with enough precision to show sub-cent costs.
  if (amount === 0) return '€ 0,00'
  if (amount < 0.01) return '€ ' + amount.toFixed(6).replace('.', ',')
  if (amount < 1) return '€ ' + amount.toFixed(4).replace('.', ',')
  return (
    '€ ' +
    amount.toLocaleString('nl-NL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}

function shortEndpoint(endpoint: string): string {
  // Strip leading `/api/` for compactness in the dropdown.
  return endpoint.replace(/^\/api\//, '')
}

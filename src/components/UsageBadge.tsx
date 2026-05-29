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

type ModelCategory =
  | 'assistant'
  | 'insights_weekly'
  | 'insights_daily'
  | 'journal_compact'

interface PreferencesResponse {
  overrides: Record<ModelCategory, string | null>
  resolved: Record<ModelCategory, string>
}

const PICKER_OPTIONS = [
  { id: 'claude-haiku-4-5-20251001', label: 'HAIKU' },
  { id: 'claude-sonnet-4-6', label: 'SONNET' },
]

const CATEGORY_LABELS: Array<{ key: ModelCategory; label: string }> = [
  { key: 'assistant', label: 'Assistant' },
  { key: 'insights_weekly', label: 'Insights weekly' },
  { key: 'insights_daily', label: 'Insights daily' },
  { key: 'journal_compact', label: 'Journal compact' },
]

export default function UsageBadge() {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<UsageSummary | null>(null)
  const [prefs, setPrefs] = useState<PreferencesResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savingCat, setSavingCat] = useState<ModelCategory | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    // Canonical fetch-on-open pattern: setState here synchronizes
    // UI loading state with the open/closed external source.
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true)
    setError(null)
    /* eslint-enable react-hooks/set-state-in-effect */
    Promise.all([fetch('/api/usage'), fetch('/api/preferences')])
      .then(async ([usageRes, prefRes]) => {
        if (cancelled) return
        const usageJson = await usageRes.json()
        const prefJson = await prefRes.json()
        if (!usageRes.ok) {
          setError(usageJson.error || 'Failed to load usage')
          return
        }
        if (!prefRes.ok) {
          setError(prefJson.error || 'Failed to load preferences')
          return
        }
        setData(usageJson as UsageSummary)
        setPrefs(prefJson as PreferencesResponse)
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

  async function setModel(category: ModelCategory, modelId: string) {
    if (!prefs) return
    setSavingCat(category)
    try {
      const res = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [category]: modelId }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Save failed')
        return
      }
      // Optimistic update — re-resolve from server-confirmed overrides.
      const updatedOverrides = json.overrides as Record<ModelCategory, string | null>
      setPrefs({
        overrides: updatedOverrides,
        resolved: {
          ...prefs.resolved,
          [category]: modelId,
        },
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSavingCat(null)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Settings"
        onClick={() => setOpen((o) => !o)}
        className={`w-9 h-9 -m-2 flex items-center justify-center transition-colors ${
          open ? 'text-zinc-200' : 'text-zinc-600 hover:text-zinc-300 active:text-zinc-300'
        }`}
      >
        <Settings size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 w-80 max-w-[calc(100vw-1.5rem)] border border-slate-800 bg-[#0a1830] shadow-xl">
          <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
            <p className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase">
              Settings
            </p>
            <p className="text-[10px] text-zinc-700 tracking-wider">ANTHROPIC</p>
          </div>

          {loading && (
            <p className="px-3 py-3 text-[11px] text-zinc-600">Loading…</p>
          )}
          {error && <p className="px-3 py-3 text-[11px] text-red-400">{error}</p>}

          {data && prefs && !loading && !error && (
            <div>
              {/* MODELS section */}
              <div className="px-3 py-2 border-b border-slate-800">
                <p className="text-[10px] text-zinc-600 tracking-wider mb-2">
                  MODELS
                </p>
                <div className="flex flex-col gap-1.5">
                  {CATEGORY_LABELS.map((cat) => {
                    const current = prefs.resolved[cat.key]
                    return (
                      <div
                        key={cat.key}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-[11px] text-zinc-400">
                          {cat.label}
                        </span>
                        <div className="flex gap-0.5">
                          {PICKER_OPTIONS.map((opt) => {
                            const active = current === opt.id
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setModel(cat.key, opt.id)}
                                disabled={savingCat === cat.key}
                                className={`text-[10px] tracking-wider px-2 py-1 border transition-colors disabled:opacity-40 ${
                                  active
                                    ? 'border-accent text-accent bg-accent/10'
                                    : 'border-slate-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 active:border-zinc-500'
                                }`}
                              >
                                {opt.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* SPEND section */}
              <div className="px-3 py-2 border-b border-slate-800">
                <p className="text-[10px] text-zinc-600 tracking-wider mb-2">
                  API SPEND
                </p>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-zinc-500">Total</span>
                  <span className="text-sm text-zinc-100 tabular-nums">
                    {formatEur(data.total_eur)}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-zinc-500">This month</span>
                  <span className="text-[11px] text-zinc-300 tabular-nums">
                    {formatEur(data.month_eur)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500">Last 7 days</span>
                  <span className="text-[11px] text-zinc-300 tabular-nums">
                    {formatEur(data.week_eur)}
                  </span>
                </div>
              </div>

              {/* BY ENDPOINT */}
              <div className="px-3 py-2 border-b border-slate-800">
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

              <div className="px-3 py-2 flex items-center justify-between text-[10px] text-zinc-600">
                <span>
                  {data.calls} call{data.calls === 1 ? '' : 's'}
                </span>
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

function formatEur(amount: number): string {
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
  return endpoint.replace(/^\/api\//, '')
}

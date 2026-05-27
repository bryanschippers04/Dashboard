export interface DailySpend {
  date: string // YYYY-MM-DD
  spend: number // positive number (already abs'd)
}

function shortDate(s: string): string {
  return new Date(s + 'T00:00:00')
    .toLocaleDateString('en-GB', { day: '2-digit' })
}

function isWeekend(s: string): boolean {
  const d = new Date(s + 'T00:00:00').getDay()
  return d === 0 || d === 6
}

export default function SpendBarChart({ daily }: { daily: DailySpend[] }) {
  const max = Math.max(1, ...daily.map((d) => d.spend))

  return (
    <div>
      <div className="flex items-end gap-1 h-24">
        {daily.map((d) => {
          const heightPct = (d.spend / max) * 100
          const empty = d.spend === 0
          return (
            <div
              key={d.date}
              className="flex-1 flex flex-col items-center gap-1 group relative"
            >
              <div className="w-full flex-1 flex items-end">
                <div
                  className={`w-full transition-all duration-300 ${
                    empty
                      ? 'bg-slate-800/50'
                      : isWeekend(d.date)
                      ? 'bg-accent/40'
                      : 'bg-accent'
                  }`}
                  style={{ height: empty ? '2px' : `${Math.max(2, heightPct)}%` }}
                  aria-label={`${d.date}: €${d.spend.toFixed(2)}`}
                />
              </div>
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <span className="text-[10px] text-accent tabular-nums whitespace-nowrap bg-[#050d1c] border border-slate-700 px-1.5 py-0.5">
                  €{d.spend.toFixed(0)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-1 mt-1.5">
        {daily.map((d) => (
          <span
            key={d.date}
            className={`flex-1 text-center text-[9px] tabular-nums ${
              isWeekend(d.date) ? 'text-zinc-700' : 'text-zinc-600'
            }`}
          >
            {shortDate(d.date)}
          </span>
        ))}
      </div>
    </div>
  )
}

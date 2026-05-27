import Link from 'next/link'
import TopNav from '@/components/TopNav'
import GenerateInsightsButton from '@/components/GenerateInsightsButton'
import InsightCard, { type InsightCardRow } from '@/components/InsightCard'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

interface InsightRow extends InsightCardRow {
  week_start: string | null
  generated_at: string
}

interface SummaryRow {
  week_start: string
  summary: string
}

export default async function InsightsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const [insightsRes, summariesRes] = user
    ? await Promise.all([
        admin
          .from('insights')
          .select(
            'id, insight_type, title, body, content, verse, week_start, day, scope, is_starred, generated_at'
          )
          .eq('user_id', user.id)
          .order('generated_at', { ascending: false }),
        admin
          .from('insight_summaries')
          .select('week_start, summary')
          .eq('user_id', user.id)
          .order('week_start', { ascending: false }),
      ])
    : [{ data: [] as InsightRow[] }, { data: [] as SummaryRow[] }]

  const rows = (insightsRes.data ?? []) as InsightRow[]
  const summaries = (summariesRes.data ?? []) as SummaryRow[]
  const summaryByWeek = new Map(summaries.map((s) => [s.week_start, s.summary]))

  const starred = rows.filter((r) => r.is_starred)
  const unstarred = rows.filter((r) => !r.is_starred)
  const groups = groupByWeek(unstarred)

  return (
    <div className="min-h-screen bg-[#050d1c]">
      <TopNav />
      <main
        className="px-3 pb-12 md:px-5 max-w-3xl mx-auto"
        style={{ paddingTop: '3rem' }}
      >
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-zinc-600 tracking-widest">07 //</span>
            <span className="text-[10px] text-zinc-500 tracking-[0.2em]">
              INSIGHTS
            </span>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-base text-zinc-100">Weekly Insights</h1>
            <Link
              href="/"
              className="text-[10px] text-zinc-600 hover:text-zinc-300 tracking-wider transition-colors"
            >
              ← HOME
            </Link>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <GenerateInsightsButton kind="daily" />
          <GenerateInsightsButton kind="weekly" />
        </div>
        <p className="text-[10px] text-zinc-600 mb-8 tracking-wider">
          Daily covers yesterday. Weekly covers last Mon–Sun and also runs
          automatically every Sunday night.
        </p>

        {starred.length > 0 && (
          <section className="mb-10">
            <p className="text-[10px] text-amber-400/80 tracking-[0.2em] uppercase mb-3">
              ★ Starred · library
            </p>
            <div className="flex flex-col gap-2">
              {starred.map((row) => (
                <InsightCard key={row.id} row={row} compact />
              ))}
            </div>
          </section>
        )}

        {groups.length === 0 ? (
          <p className="text-xs text-zinc-700 py-4">
            No insights yet. Hit Generate above once you have a day or week of
            journal and transaction data.
          </p>
        ) : (
          <div className="flex flex-col gap-8">
            {groups.map((g) => (
              <section key={g.weekStart ?? 'unknown'}>
                <p className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase mb-2">
                  Week of {formatWeek(g.weekStart)}
                </p>
                {g.weekStart && summaryByWeek.get(g.weekStart) && (
                  <p className="text-[11px] text-zinc-500 italic leading-relaxed mb-3 border-l-2 border-slate-800 pl-3">
                    {summaryByWeek.get(g.weekStart)}
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  {g.items.map((row) => (
                    <InsightCard key={row.id} row={row} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function groupByWeek(rows: InsightRow[]) {
  const map = new Map<string, InsightRow[]>()
  for (const r of rows) {
    // Daily rows: group by the Monday of the week containing their `day`.
    // Weekly rows: group by their stored week_start.
    const key = r.scope === 'daily' && r.day ? mondayOf(r.day) : r.week_start ?? 'unknown'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }
  // Sort items inside each group: weekly first, then daily by day desc.
  for (const list of map.values()) {
    list.sort((a, b) => {
      const aw = a.scope === 'weekly' ? 1 : 0
      const bw = b.scope === 'weekly' ? 1 : 0
      if (aw !== bw) return bw - aw
      const ad = a.day ?? a.week_start ?? ''
      const bd = b.day ?? b.week_start ?? ''
      return bd.localeCompare(ad)
    })
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([weekStart, items]) => ({
      weekStart: weekStart === 'unknown' ? null : weekStart,
      items,
    }))
}

function mondayOf(day: string): string {
  const d = new Date(day + 'T00:00:00Z')
  const dow = d.getUTCDay() // 0 = Sun
  const offset = dow === 0 ? 6 : dow - 1
  d.setUTCDate(d.getUTCDate() - offset)
  return d.toISOString().slice(0, 10)
}

function formatWeek(weekStart: string | null): string {
  if (!weekStart) return '—'
  const start = new Date(weekStart + 'T00:00:00Z')
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 6)
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
    })
  return `${fmt(start)} – ${fmt(end)}`
}

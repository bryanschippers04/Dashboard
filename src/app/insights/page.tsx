import Link from 'next/link'
import TopNav from '@/components/TopNav'
import GenerateInsightsButton from '@/components/GenerateInsightsButton'
import InsightCard, { type InsightCardRow } from '@/components/InsightCard'
import InsightsViewToggle, {
  type InsightsView,
} from '@/components/InsightsViewToggle'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { resolveDailyTargetDay } from '@/lib/insightsServer'

interface InsightRow extends InsightCardRow {
  week_start: string | null
  generated_at: string
}

interface SummaryRow {
  week_start: string
  summary: string
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const { view: rawView } = await searchParams
  const view: InsightsView = rawView === 'daily' ? 'daily' : 'weekly'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const [insightsRes, summariesRes, dailyTargetDay] = user
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
        resolveDailyTargetDay(admin, user.id),
      ])
    : [
        { data: [] as InsightRow[] },
        { data: [] as SummaryRow[] },
        null as string | null,
      ]

  const rows = (insightsRes.data ?? []) as InsightRow[]
  const summaries = (summariesRes.data ?? []) as SummaryRow[]
  const summaryByWeek = new Map(summaries.map((s) => [s.week_start, s.summary]))

  const starred = rows.filter((r) => r.is_starred)
  const unstarred = rows.filter((r) => !r.is_starred)
  const inView = unstarred.filter((r) =>
    view === 'weekly' ? r.scope !== 'daily' : r.scope === 'daily'
  )

  return (
    <div className="min-h-screen bg-[#050d1c]">
      <TopNav />
      <main className="app-page-top px-3 pb-12 md:px-5 max-w-3xl mx-auto">
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-zinc-600 tracking-widest">07 //</span>
            <span className="text-[10px] text-zinc-500 tracking-[0.2em]">
              INSIGHTS
            </span>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-base text-zinc-100">Insights</h1>
            <Link
              href="/"
              className="text-[10px] text-zinc-600 hover:text-zinc-300 tracking-wider transition-colors"
            >
              ← HOME
            </Link>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <GenerateInsightsButton
            kind="daily"
            label={
              dailyTargetDay
                ? `+ DAILY · ${formatDailyButtonLabel(dailyTargetDay)}`
                : undefined
            }
            successView="daily"
          />
          <GenerateInsightsButton kind="weekly" successView="weekly" />
        </div>
        <p className="text-[10px] text-zinc-600 mb-8 tracking-wider">
          Daily covers the day of your most recent journal entry. Weekly
          covers last Mon–Sun and also runs automatically every Sunday
          night.
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

        <InsightsViewToggle active={view} />

        {view === 'weekly' ? (
          <WeeklyTimeline rows={inView} summaryByWeek={summaryByWeek} />
        ) : (
          <DailyTimeline rows={inView} />
        )}
      </main>
    </div>
  )
}

function WeeklyTimeline({
  rows,
  summaryByWeek,
}: {
  rows: InsightRow[]
  summaryByWeek: Map<string, string>
}) {
  const groups = groupByWeek(rows)
  if (groups.length === 0) {
    return (
      <p className="text-xs text-zinc-700 py-4">
        No weekly insights yet. Hit + WEEKLY above once you have a Mon–Sun
        of data, or wait for Sunday night.
      </p>
    )
  }
  return (
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
  )
}

function DailyTimeline({ rows }: { rows: InsightRow[] }) {
  const groups = groupByDay(rows)
  if (groups.length === 0) {
    return (
      <p className="text-xs text-zinc-700 py-4">
        No daily insights yet. Hit + DAILY above to generate one for
        yesterday.
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-6">
      {groups.map((g) => (
        <section key={g.day}>
          <p className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase mb-2">
            {formatDayHeader(g.day)}
          </p>
          <div className="flex flex-col gap-2">
            {g.items.map((row) => (
              <InsightCard key={row.id} row={row} compact />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function groupByWeek(rows: InsightRow[]) {
  const map = new Map<string, InsightRow[]>()
  for (const r of rows) {
    const key = r.week_start ?? 'unknown'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([weekStart, items]) => ({
      weekStart: weekStart === 'unknown' ? null : weekStart,
      items,
    }))
}

function groupByDay(rows: InsightRow[]) {
  const map = new Map<string, InsightRow[]>()
  for (const r of rows) {
    const key = r.day ?? 'unknown'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }
  return Array.from(map.entries())
    .filter(([day]) => day !== 'unknown')
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([day, items]) => ({ day, items }))
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

function formatDailyButtonLabel(day: string): string {
  const d = new Date(day + 'T00:00:00Z')
  return d
    .toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
    })
    .toUpperCase()
}

function formatDayHeader(day: string): string {
  const d = new Date(day + 'T00:00:00Z')
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  })
}

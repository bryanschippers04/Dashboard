import Link from 'next/link'
import TopNav from '@/components/TopNav'
import GenerateInsightsButton from '@/components/GenerateInsightsButton'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

interface InsightRow {
  id: string
  insight_type: 'pattern' | 'action' | 'win' | 'warning' | string
  title: string | null
  body: string | null
  content: string | null
  verse: { ref?: string; text?: string } | null
  week_start: string | null
  generated_at: string
}

const TYPE_STYLES: Record<string, { label: string; color: string }> = {
  pattern: { label: 'PATTERN', color: 'text-accent' },
  action: { label: 'ACTION', color: 'text-amber-400' },
  win: { label: 'WIN', color: 'text-emerald-400' },
  warning: { label: 'WARNING', color: 'text-red-400' },
}

export default async function InsightsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data } = user
    ? await admin
        .from('insights')
        .select(
          'id, insight_type, title, body, content, verse, week_start, generated_at'
        )
        .eq('user_id', user.id)
        .order('week_start', { ascending: false, nullsFirst: false })
        .order('generated_at', { ascending: false })
    : { data: [] as InsightRow[] }

  const rows = (data ?? []) as InsightRow[]
  const groups = groupByWeek(rows)

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

        <div className="mb-6">
          <GenerateInsightsButton />
          <p className="text-[10px] text-zinc-600 mt-2 tracking-wider">
            Runs Claude over last Mon–Sun: journal · transactions · goals.
          </p>
        </div>

        {groups.length === 0 ? (
          <p className="text-xs text-zinc-700 py-4">
            No insights yet. Hit Generate above once you have a week of journal
            and transaction data.
          </p>
        ) : (
          <div className="flex flex-col gap-8">
            {groups.map((g) => (
              <section key={g.weekStart ?? 'unknown'}>
                <p className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase mb-3">
                  Week of {formatWeek(g.weekStart)}
                </p>
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

function InsightCard({ row }: { row: InsightRow }) {
  const style = TYPE_STYLES[row.insight_type] ?? {
    label: row.insight_type.toUpperCase(),
    color: 'text-zinc-400',
  }
  const title = row.title ?? row.content?.split('\n')[0] ?? ''
  const body =
    row.body ?? (row.title ? '' : row.content?.split('\n').slice(1).join('\n') ?? '')

  return (
    <div className="border border-slate-800 bg-[#0a1830] p-4">
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`text-[10px] tracking-[0.2em] ${style.color}`}
        >
          {style.label}
        </span>
      </div>
      {title && (
        <p className="text-sm text-zinc-100 leading-snug mb-1">{title}</p>
      )}
      {body && (
        <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">
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

function groupByWeek(rows: InsightRow[]) {
  const map = new Map<string, InsightRow[]>()
  for (const r of rows) {
    const key = r.week_start ?? 'unknown'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }
  return Array.from(map.entries()).map(([weekStart, items]) => ({
    weekStart: weekStart === 'unknown' ? null : weekStart,
    items,
  }))
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

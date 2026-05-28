import Link from 'next/link'
import TopNav from '@/components/TopNav'
import GoalForm from '@/components/GoalForm'
import GoalList, { type Goal } from '@/components/GoalList'
import { createClient } from '@/lib/supabase/server'

const PERIOD_ORDER: Goal['type'][] = ['daily', 'weekly', 'monthly']
const PERIOD_LABELS: Record<Goal['type'], string> = {
  daily: 'DAILY',
  weekly: 'WEEKLY',
  monthly: 'MONTHLY',
}
const EMPTY_HINTS: Record<Goal['type'], string> = {
  daily: 'No daily goals yet.',
  weekly: 'No weekly goals yet.',
  monthly: 'No monthly goals yet.',
}

function pct(g: Goal) {
  return g.target > 0 ? (g.current_progress / g.target) * 100 : 0
}

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('goals')
    .select('id, title, type, target, current_progress')

  const goals = (data ?? []) as Goal[]

  // Section sort: least-progressed first (action-oriented).
  const grouped: Record<Goal['type'], Goal[]> = { daily: [], weekly: [], monthly: [] }
  for (const g of goals) grouped[g.type]?.push(g)
  for (const type of PERIOD_ORDER) {
    grouped[type].sort((a, b) => pct(a) - pct(b))
  }

  const valid = goals.filter((g) => g.target > 0)
  const totalTarget = valid.reduce((s, g) => s + g.target, 0)
  const totalProgress = valid.reduce((s, g) => s + Math.min(g.current_progress, g.target), 0)
  const overallPct = totalTarget === 0 ? 0 : Math.round((totalProgress / totalTarget) * 100)

  return (
    <div className="min-h-screen bg-[#050d1c]">
      <TopNav />
      <main className="app-page-top px-3 pb-3 md:px-5 md:pb-5 max-w-3xl mx-auto">
        {/* Page header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-zinc-600 tracking-widest">05 //</span>
            <span className="text-[10px] text-zinc-500 tracking-[0.2em]">GOALS</span>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-base text-zinc-100">Goals Tracker</h1>
            <Link
              href="/"
              className="text-[10px] text-zinc-600 hover:text-zinc-300 tracking-wider transition-colors"
            >
              ← HOME
            </Link>
          </div>
        </div>

        {/* Overall progress */}
        {goals.length > 0 && (
          <div className="mb-5 border border-slate-800 bg-[#0a1830] px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase">Overall</p>
              <p className="text-[10px] text-zinc-400 tabular-nums">
                {totalProgress}/{totalTarget} · <span className="text-accent">{overallPct}%</span>
              </p>
            </div>
            <div className="h-0.5 bg-slate-800 relative overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-accent transition-all duration-300"
                style={{ width: `${overallPct}%` }}
              />
            </div>
          </div>
        )}

        <GoalForm />

        <div className="mt-6 flex flex-col gap-6">
          {PERIOD_ORDER.map((type) => {
            const items = grouped[type]
            return (
              <section key={type}>
                <div className="flex items-baseline gap-2 mb-2">
                  <p className="text-[10px] text-zinc-500 tracking-[0.2em]">
                    {PERIOD_LABELS[type]}
                  </p>
                  {items.length > 0 && (
                    <span className="text-[10px] text-zinc-700 tabular-nums">· {items.length}</span>
                  )}
                </div>
                {items.length === 0 ? (
                  <p className="text-xs text-zinc-700 py-2">{EMPTY_HINTS[type]}</p>
                ) : (
                  <GoalList goals={items} />
                )}
              </section>
            )
          })}
        </div>
      </main>
    </div>
  )
}

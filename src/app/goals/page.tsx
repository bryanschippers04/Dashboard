import Link from 'next/link'
import TopNav from '@/components/TopNav'
import GoalForm from '@/components/GoalForm'
import GoalList, { type Goal } from '@/components/GoalList'
import { createClient } from '@/lib/supabase/server'
import {
  BUCKET_LABELS,
  BUCKET_ORDER,
  bucketFor,
  compareByDeadline,
  type GoalBucket,
} from '@/lib/goalBuckets'

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('goals')
    .select('id, title, deadline, target, current_progress')

  const goals = (data ?? []) as Goal[]

  const grouped: Record<GoalBucket, Goal[]> = {
    overdue: [],
    week: [],
    month: [],
    later: [],
    undated: [],
  }
  for (const g of goals) grouped[bucketFor(g.deadline)].push(g)
  for (const bucket of BUCKET_ORDER) {
    grouped[bucket].sort((a, b) => compareByDeadline(a.deadline, b.deadline))
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
          {goals.length === 0 ? (
            <p className="text-xs text-zinc-700 py-2">No goals yet. Add one above.</p>
          ) : (
            BUCKET_ORDER.map((bucket) => {
              const items = grouped[bucket]
              if (items.length === 0) return null
              return (
                <section key={bucket}>
                  <div className="flex items-baseline gap-2 mb-2">
                    <p
                      className={`text-[10px] tracking-[0.2em] ${
                        bucket === 'overdue' ? 'text-rose-400' : 'text-zinc-500'
                      }`}
                    >
                      {BUCKET_LABELS[bucket]}
                    </p>
                    <span className="text-[10px] text-zinc-700 tabular-nums">
                      · {items.length}
                    </span>
                  </div>
                  <GoalList goals={items} />
                </section>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}

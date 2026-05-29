import Link from 'next/link'
import TopNav from '@/components/TopNav'
import HabitsForm from '@/components/HabitsForm'
import SortableHabitList from '@/components/SortableHabitList'
import type { HabitRowData } from '@/components/HabitRow'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getHabitsWithProgress } from '@/lib/habitsServer'
import type { Cadence } from '@/lib/habits'

const SECTION_ORDER: Cadence[] = ['daily', 'weekly', 'monthly']
const SECTION_LABELS: Record<Cadence, string> = {
  daily: 'DAILY',
  weekly: 'WEEKLY',
  monthly: 'MONTHLY',
}

export default async function HabitsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const habits = user ? await getHabitsWithProgress(admin, user.id) : []

  const byCadence: Record<Cadence, HabitRowData[]> = {
    daily: [],
    weekly: [],
    monthly: [],
  }
  for (const h of habits) byCadence[h.cadence].push(h)

  return (
    <div className="min-h-screen bg-[#050d1c]">
      <TopNav />
      <main className="app-page-top px-3 pb-3 md:px-5 md:pb-5 max-w-3xl mx-auto">
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-zinc-600 tracking-widest">05 //</span>
            <span className="text-[10px] text-zinc-500 tracking-[0.2em]">
              HABITS
            </span>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-base text-zinc-100">Habit Tracker</h1>
            <Link
              href="/"
              className="text-[10px] text-zinc-600 hover:text-zinc-300 tracking-wider transition-colors"
            >
              ← HOME
            </Link>
          </div>
        </div>

        <HabitsForm />

        <div className="mt-5 flex flex-col gap-6">
          {SECTION_ORDER.map((cadence) => {
            const items = byCadence[cadence]
            return (
              <section key={cadence}>
                <p className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase mb-3">
                  {SECTION_LABELS[cadence]}
                </p>
                {items.length === 0 ? (
                  <p className="text-xs text-zinc-700 py-2">
                    No {cadence} habits yet.
                  </p>
                ) : (
                  <SortableHabitList habits={items} />
                )}
              </section>
            )
          })}
        </div>
      </main>
    </div>
  )
}

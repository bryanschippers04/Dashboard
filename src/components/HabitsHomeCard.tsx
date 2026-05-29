import Link from 'next/link'
import Card from './Card'
import HabitRow, { type HabitRowData } from './HabitRow'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getHabitsWithProgress } from '@/lib/habitsServer'

export default async function HabitsHomeCard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const admin = createAdminClient()
  const all = user ? await getHabitsWithProgress(admin, user.id) : []

  const today = all.filter((h) => h.cadence === 'daily')
  const weekly = all.filter((h) => h.cadence === 'weekly')
  const weeklyHit = weekly.filter((h) => h.hit_target).length
  const todayHit = today.filter((h) => h.hit_target).length

  return (
    <Card
      number="03"
      label="HABITS"
      action={
        <Link
          href="/habits"
          className="text-[10px] text-zinc-600 hover:text-zinc-300 tracking-widest transition-colors"
        >
          OPEN →
        </Link>
      }
    >
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl text-zinc-100 tabular-nums">
              {todayHit}
            </span>
            <span className="text-[10px] text-zinc-600">
              / {today.length} TODAY
            </span>
          </div>
          {weekly.length > 0 && (
            <span className="text-[10px] text-zinc-500 tabular-nums">
              weekly: {weeklyHit}/{weekly.length} hit
            </span>
          )}
        </div>

        {today.length === 0 ? (
          <p className="text-xs text-zinc-700">No daily habits yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {today.slice(0, 5).map((h: HabitRowData) => (
              <HabitRow key={h.id} habit={h} compact />
            ))}
          </ul>
        )}

        <Link
          href="/habits"
          className="mt-4 block text-[10px] text-zinc-700 hover:text-accent transition-colors tracking-widest"
        >
          + NEW HABIT
        </Link>
      </div>
    </Card>
  )
}

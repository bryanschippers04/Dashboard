import Link from 'next/link'
import TopNav from '@/components/TopNav'
import OperatorCard from '@/components/OperatorCard'
import SessionCard from '@/components/SessionCard'
import Card from '@/components/Card'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [{ count: journalCount }, { data: lastEntry }] = await Promise.all([
    supabase
      .from('journal_entries')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('journal_entries')
      .select('timestamp, rating')
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  return (
    <div className="min-h-screen bg-[#050d1c]">
      <TopNav />
      <main className="px-3 pb-3 md:px-5 md:pb-5" style={{ paddingTop: '3rem' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-7xl mx-auto">
          <OperatorCard />
          <SessionCard />

          {/* Journal */}
          <Card
            number="03"
            label="JOURNAL"
            action={
              <Link
                href="/journal"
                className="text-[10px] text-zinc-600 hover:text-zinc-300 tracking-widest transition-colors"
              >
                OPEN →
              </Link>
            }
          >
            <div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl text-zinc-100 tabular-nums">
                  {journalCount ?? 0}
                </span>
                <span className="text-[10px] text-zinc-600">ENTRIES</span>
              </div>
              {lastEntry ? (
                <div>
                  <p className="text-[10px] text-zinc-600 mb-1 tracking-wider">LAST ENTRY</p>
                  <p className="text-xs text-zinc-400">
                    {new Date(lastEntry.timestamp).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: '2-digit',
                    })}
                    {lastEntry.rating !== null && (
                      <span className="text-accent ml-2">· {lastEntry.rating}/10</span>
                    )}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-zinc-700">Start with one.</p>
              )}
              <Link
                href="/journal"
                className="mt-5 block text-[10px] text-zinc-700 hover:text-accent transition-colors tracking-widest"
              >
                + NEW ENTRY
              </Link>
            </div>
          </Card>

          {/* Tasks — Milestone 2 */}
          <Card number="04" label="TODAY · KEY">
            <div className="space-y-2">
              <p className="text-[10px] text-zinc-700">Tasks coming in Milestone 2.</p>
              <div className="mt-3 space-y-2 opacity-30">
                {['Push next product update', 'Review analytics', 'Weekly review'].map((t) => (
                  <div key={t} className="flex items-center gap-2">
                    <div className="w-3 h-3 border border-zinc-700" />
                    <span className="text-xs text-zinc-500">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Goals — Milestone 2 */}
          <Card number="05" label="GOALS">
            <div className="space-y-3 opacity-30">
              <div>
                <p className="text-[10px] text-zinc-600 tracking-wider mb-2">THIS WEEK</p>
                <div className="h-0.5 bg-slate-800 relative">
                  <div className="absolute left-0 top-0 h-full bg-accent w-1/3" />
                </div>
              </div>
              <p className="text-[10px] text-zinc-700">Goals coming in Milestone 2.</p>
            </div>
          </Card>

          {/* Finance — Milestone 4 */}
          <Card number="06" label="FINANCE PULSE">
            <div className="opacity-30">
              <p className="text-[10px] text-zinc-600 tracking-wider mb-1">NET WORTH</p>
              <p className="text-2xl text-zinc-100">—</p>
              <p className="text-[10px] text-zinc-700 mt-3">Plaid integration in Milestone 4.</p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}

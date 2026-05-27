import Link from 'next/link'
import TopNav from '@/components/TopNav'
import OperatorCard from '@/components/OperatorCard'
import SessionCard from '@/components/SessionCard'
import Card from '@/components/Card'
import type { Goal } from '@/components/GoalList'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()

  const isoDate = (d: Date) => d.toISOString().slice(0, 10)
  const sevenDaysAgo = isoDate(new Date(Date.now() - 7 * 86400000))

  const [
    { count: journalCount },
    { data: lastEntry },
    { data: allTodos },
    { data: allGoals },
    { data: bankAccountsData },
    { data: recentTx },
  ] = await Promise.all([
    supabase
      .from('journal_entries')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('journal_entries')
      .select('timestamp, rating')
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('todos')
      .select('id, title, completed, due_date'),
    supabase
      .from('goals')
      .select('id, title, type, target, current_progress'),
    user
      ? admin
          .from('bank_accounts')
          .select('id, name, iban')
          .eq('user_id', user.id)
      : Promise.resolve({ data: [] }),
    supabase
      .from('transactions')
      .select('id, amount, merchant, category, date')
      .gte('date', sevenDaysAgo)
      .order('date', { ascending: false })
      .order('id', { ascending: false }),
  ])

  const todos = allTodos ?? []
  const openTodos = todos
    .filter((t) => !t.completed)
    .sort((a, b) => {
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
      if (a.due_date) return -1
      if (b.due_date) return 1
      return 0
    })
    .slice(0, 3)
  const todoPct = todos.length === 0 ? 0 : Math.round((todos.filter((t) => t.completed).length / todos.length) * 100)

  const goals = (allGoals ?? []) as Goal[]
  const goalPct = (g: Goal) => (g.target > 0 ? (g.current_progress / g.target) * 100 : 0)
  // Home card sort: MOST-progressed first (celebratory).
  // Note: the /goals page sorts the opposite way (least first, action-oriented).
  const activeGoals = goals
    .filter((g) => g.target > 0 && g.current_progress < g.target)
    .sort((a, b) => goalPct(b) - goalPct(a))
    .slice(0, 3)
  const validGoals = goals.filter((g) => g.target > 0)
  const goalTotalTarget = validGoals.reduce((s, g) => s + g.target, 0)
  const goalTotalProgress = validGoals.reduce(
    (s, g) => s + Math.min(g.current_progress, g.target),
    0
  )
  const goalsOverallPct =
    goalTotalTarget === 0 ? 0 : Math.round((goalTotalProgress / goalTotalTarget) * 100)

  const bankAccounts = (bankAccountsData ?? []) as Array<{ id: string; name: string | null; iban: string | null }>
  const ownIbans = new Set(
    bankAccounts
      .map((a) => a.iban?.replace(/\s+/g, '').toUpperCase())
      .filter((x): x is string => !!x)
  )
  const txRows = (recentTx ?? []) as Array<{
    id: string
    amount: number
    merchant: string | null
    category: string | null
    date: string
  }>
  const isSelfTransfer = (t: (typeof txRows)[number]) => {
    if (t.category === 'transfer') return true
    if (!t.merchant) return false
    const m = t.merchant.replace(/\s+/g, '').toUpperCase()
    for (const iban of ownIbans) if (m.includes(iban)) return true
    return false
  }
  const weekSpend = txRows
    .filter((t) => Number(t.amount) < 0 && !isSelfTransfer(t))
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
  const recentForCard = txRows.slice(0, 3)

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

          {/* Tasks */}
          <Card
            number="04"
            label="TODAY · KEY"
            action={
              <Link
                href="/todos"
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
                    {todos.filter((t) => !t.completed).length}
                  </span>
                  <span className="text-[10px] text-zinc-600">OPEN</span>
                </div>
                {todos.length > 0 && (
                  <span className="text-[10px] text-accent tabular-nums">{todoPct}%</span>
                )}
              </div>

              {openTodos.length === 0 ? (
                <p className="text-xs text-zinc-700">
                  {todos.length === 0 ? 'Add your first todo.' : 'All done. Nice.'}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {openTodos.map((t) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <div className="w-3 h-3 border border-slate-700 shrink-0" />
                      <span className="text-xs text-zinc-400 truncate">{t.title}</span>
                    </div>
                  ))}
                </div>
              )}

              <Link
                href="/todos"
                className="mt-4 block text-[10px] text-zinc-700 hover:text-accent transition-colors tracking-widest"
              >
                + NEW TODO
              </Link>
            </div>
          </Card>

          {/* Goals */}
          <Card
            number="05"
            label="GOALS"
            action={
              <Link
                href="/goals"
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
                    {activeGoals.length}
                  </span>
                  <span className="text-[10px] text-zinc-600">ACTIVE</span>
                </div>
                {goals.length > 0 && (
                  <span className="text-[10px] text-accent tabular-nums">{goalsOverallPct}%</span>
                )}
              </div>

              {goals.length === 0 ? (
                <p className="text-xs text-zinc-700">Add your first goal.</p>
              ) : activeGoals.length === 0 ? (
                <p className="text-xs text-emerald-400">All goals reached.</p>
              ) : (
                <div className="space-y-2.5">
                  {activeGoals.map((g) => {
                    const pct = Math.min(100, goalPct(g))
                    return (
                      <div key={g.id}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs text-zinc-400 truncate">{g.title}</span>
                          <span className="text-[10px] text-zinc-500 tabular-nums shrink-0">
                            {g.current_progress}/{g.target}
                          </span>
                        </div>
                        <div className="h-0.5 bg-slate-800 relative overflow-hidden">
                          <div
                            className="absolute left-0 top-0 h-full bg-accent transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <Link
                href="/goals"
                className="mt-4 block text-[10px] text-zinc-700 hover:text-accent transition-colors tracking-widest"
              >
                + NEW GOAL
              </Link>
            </div>
          </Card>

          {/* Finance */}
          <Card
            number="06"
            label="FINANCE PULSE"
            action={
              <Link
                href="/finance"
                className="text-[10px] text-zinc-600 hover:text-zinc-300 tracking-widest transition-colors"
              >
                OPEN →
              </Link>
            }
          >
            {bankAccounts.length === 0 ? (
              <div>
                <p className="text-[10px] text-zinc-600 tracking-wider mb-1">SPEND · 7D</p>
                <p className="text-2xl text-zinc-100">—</p>
                <Link
                  href="/finance"
                  className="mt-4 block text-[10px] text-zinc-700 hover:text-accent transition-colors tracking-widest"
                >
                  + CONNECT BANK
                </Link>
              </div>
            ) : (
              <div>
                <div className="mb-3">
                  <p className="text-[10px] text-zinc-600 tracking-wider mb-1">SPEND · 7D</p>
                  <p className="text-2xl text-zinc-100 tabular-nums">
                    €{' '}
                    {weekSpend.toLocaleString('nl-NL', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </p>
                </div>
                {recentForCard.length === 0 ? (
                  <p className="text-xs text-zinc-700">No transactions yet. Sync to load.</p>
                ) : (
                  <div className="space-y-1.5">
                    {recentForCard.map((t) => {
                      const transfer = isSelfTransfer(t)
                      const amount = Number(t.amount)
                      return (
                        <div key={t.id} className="flex items-center justify-between gap-2">
                          <span
                            className={`text-xs truncate ${
                              transfer ? 'text-zinc-600' : 'text-zinc-400'
                            }`}
                          >
                            {t.merchant ?? 'Unknown'}
                          </span>
                          <span
                            className={`text-[10px] tabular-nums shrink-0 ${
                              transfer
                                ? 'text-zinc-600'
                                : amount > 0
                                ? 'text-accent'
                                : 'text-zinc-500'
                            }`}
                          >
                            {amount < 0 ? '−' : '+'}€
                            {Math.abs(amount).toLocaleString('nl-NL', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
                <Link
                  href="/finance"
                  className="mt-4 block text-[10px] text-zinc-700 hover:text-accent transition-colors tracking-widest"
                >
                  OPEN FINANCE →
                </Link>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  )
}

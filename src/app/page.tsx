import Link from 'next/link'
import TopNav from '@/components/TopNav'
import AssistantCard from '@/components/AssistantCard'
import HabitsHomeCard from '@/components/HabitsHomeCard'
import UpcomingCard from '@/components/UpcomingCard'
import AutoSync from '@/components/AutoSync'
import Card from '@/components/Card'
import FinanceSyncButton from '@/components/FinanceSyncButton'
import NotesHomeCard, { type NoteRow } from '@/components/NotesHomeCard'
import type { Goal } from '@/components/GoalList'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  BUCKET_ORDER,
  bucketFor,
  compareByDeadline,
  formatDeadline,
} from '@/lib/goalBuckets'
import {
  buildBankIbanSet,
  derivedBalance,
  isSelfTransfer,
  type ManualAccountRef,
  type TransactionRef,
} from '@/lib/finance'

// Helpers hoisted out of the component so React 19's purity rules
// don't flag the request-scoped Date/Math usage inside an RSC.
const isoDate = (d: Date) => d.toISOString().slice(0, 10)

function sevenDaysAgoIso(): string {
  return isoDate(new Date(Date.now() - 7 * 86400000))
}

function pickRandom<T>(arr: readonly T[]): T | null {
  if (arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()

  const sevenDaysAgo = sevenDaysAgoIso()

  const [
    { count: journalCount },
    { data: lastEntry },
    { data: allTodos },
    { data: allGoals },
    { data: bankAccountsData },
    { data: recentTx },
    { data: manualData },
    { data: latestSummary },
    { data: starredData },
    { data: notesData },
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
      .select('id, title, deadline, target, current_progress'),
    user
      ? admin
          .from('bank_accounts')
          .select('id, name, iban')
          .eq('user_id', user.id)
      : Promise.resolve({ data: [] }),
    supabase
      .from('transactions')
      .select(
        'id, amount, merchant, category, date, counterparty_iban, booked_at, provider_sequence'
      )
      .gte('date', sevenDaysAgo)
      .order('booked_at', { ascending: false, nullsFirst: false })
      .order('provider_sequence', { ascending: true, nullsFirst: false })
      .order('date', { ascending: false })
      .order('id', { ascending: false }),
    user
      ? admin
          .from('manual_accounts')
          .select('id, name, iban, balance, balance_set_at')
          .eq('user_id', user.id)
      : Promise.resolve({ data: [] }),
    user
      ? admin
          .from('insight_summaries')
          .select('week_start, summary')
          .eq('user_id', user.id)
          .order('week_start', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? admin
          .from('insights')
          .select('id, insight_type, title, body, content')
          .eq('user_id', user.id)
          .eq('is_starred', true)
      : Promise.resolve({ data: [] }),
    user
      ? supabase
          .from('notes')
          .select('id, text, created_at')
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
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
  // Home card sort: soonest deadline first (urgency-driven, mirrors /goals).
  const bucketRank: Record<string, number> = Object.fromEntries(
    BUCKET_ORDER.map((b, i) => [b, i])
  )
  const activeGoals = goals
    .filter((g) => g.target > 0 && g.current_progress < g.target)
    .sort((a, b) => {
      const ra = bucketRank[bucketFor(a.deadline)]
      const rb = bucketRank[bucketFor(b.deadline)]
      if (ra !== rb) return ra - rb
      return compareByDeadline(a.deadline, b.deadline)
    })
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
  const bankIbans = buildBankIbanSet(bankAccounts)

  const txRows = (recentTx ?? []) as Array<{
    id: string
    amount: number
    merchant: string | null
    category: string | null
    date: string
    counterparty_iban: string | null
    booked_at: string | null
  }>

  const manualRefs = ((manualData ?? []) as Array<{
    id: string
    name: string
    iban: string | null
    balance: number
    balance_set_at: string
  }>).map((m) => ({
    id: m.id,
    name: m.name,
    iban: m.iban,
    balance: Number(m.balance),
    balance_set_at: m.balance_set_at,
  })) satisfies ManualAccountRef[]

  const transactionRefs = txRows as TransactionRef[]

  const weekSpend = txRows
    .filter(
      (t) =>
        Number(t.amount) < 0 &&
        !isSelfTransfer(t as TransactionRef, manualRefs, bankIbans)
    )
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
  const recentForCard = txRows.slice(0, 3)

  const distillation = latestSummary as { week_start: string; summary: string } | null
  const starredAll = (starredData ?? []) as Array<{
    id: string
    insight_type: string
    title: string | null
    body: string | null
    content: string | null
  }>
  const randomStarred = pickRandom(starredAll)

  const notes = (notesData ?? []) as NoteRow[]

  const netWorth = manualRefs.reduce(
    (s, m) => s + derivedBalance(m, transactionRefs),
    0
  )
  const hasFinance = bankAccounts.length > 0 || manualRefs.length > 0

  return (
    <div className="min-h-screen bg-[#050d1c]">
      <TopNav />
      <AutoSync />
      <main className="app-page-top px-3 pb-3 md:px-5 md:pb-5">
        <div className="max-w-7xl mx-auto mb-3">
          <AssistantCard />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-7xl mx-auto">
          {/* Tasks */}
          <Card
            number="01"
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

          {/* Upcoming (calendar) */}
          <UpcomingCard />

          {/* Habits */}
          <HabitsHomeCard />

          {/* Insights */}
          <Card
            number="04"
            label="INSIGHTS"
            action={
              <Link
                href="/insights"
                className="text-[10px] text-zinc-600 hover:text-zinc-300 tracking-widest transition-colors"
              >
                OPEN →
              </Link>
            }
          >
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-[10px] text-zinc-600 tracking-wider mb-2">
                  WEEK SUMMARY
                </p>
                {distillation ? (
                  <p className="text-xs text-zinc-400 italic leading-relaxed">
                    {distillation.summary}
                  </p>
                ) : (
                  <p className="text-xs text-zinc-700">
                    Run weekly insights to generate your first summary.
                  </p>
                )}
              </div>

              <div>
                <p className="text-[10px] text-amber-400/80 tracking-wider mb-2">
                  ★ FROM LIBRARY
                </p>
                {randomStarred ? (
                  <div>
                    <p className="text-xs text-zinc-200 leading-snug mb-1">
                      {randomStarred.title ??
                        randomStarred.content?.split('\n')[0] ??
                        ''}
                    </p>
                    {randomStarred.body && (
                      <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-2">
                        {randomStarred.body}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-700">
                    Star insights on /insights to build your library.
                  </p>
                )}
              </div>

              <Link
                href="/insights"
                className="text-[10px] text-zinc-700 hover:text-accent transition-colors tracking-widest"
              >
                OPEN INSIGHTS →
              </Link>
            </div>
          </Card>

          {/* Notes to self */}
          <NotesHomeCard initialNotes={notes} />

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
            {!hasFinance ? (
              <div>
                <p className="text-[10px] text-zinc-600 tracking-wider mb-1">NET WORTH</p>
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
                  <p className="text-[10px] text-zinc-600 tracking-wider mb-1">NET WORTH</p>
                  <p className="text-2xl text-zinc-100 tabular-nums">
                    €{' '}
                    {netWorth.toLocaleString('nl-NL', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </p>
                  {bankAccounts.length > 0 && (
                    <p className="text-[10px] text-zinc-600 mt-1 tracking-wider">
                      SPEND · 7D €{' '}
                      {weekSpend.toLocaleString('nl-NL', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  )}
                </div>
                {recentForCard.length === 0 ? (
                  <p className="text-xs text-zinc-700">
                    {bankAccounts.length === 0
                      ? 'Connect a bank to see transactions.'
                      : 'No transactions yet. Sync to load.'}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {recentForCard.map((t) => {
                      const transfer = isSelfTransfer(t as TransactionRef, manualRefs, bankIbans)
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
                <div className="mt-4 flex items-center justify-between gap-2">
                  {bankAccounts.length > 0 ? (
                    <FinanceSyncButton lastSyncedAt={null} />
                  ) : (
                    <span />
                  )}
                  <Link
                    href="/finance"
                    className="text-[10px] text-zinc-700 hover:text-accent transition-colors tracking-widest"
                  >
                    OPEN FINANCE →
                  </Link>
                </div>
              </div>
            )}
          </Card>

          {/* Goals */}
          <Card
            number="07"
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
                    const overdue = bucketFor(g.deadline) === 'overdue'
                    return (
                      <div key={g.id}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs text-zinc-400 truncate">{g.title}</span>
                          <span className="text-[10px] text-zinc-500 tabular-nums shrink-0">
                            {g.current_progress}/{g.target}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span
                            className={`text-[10px] tracking-wider tabular-nums ${
                              overdue ? 'text-rose-400' : 'text-zinc-600'
                            }`}
                          >
                            {formatDeadline(g.deadline)}
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

          {/* Journal */}
          <Card
            number="08"
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
        </div>
      </main>
    </div>
  )
}

import Link from 'next/link'
import TopNav from '@/components/TopNav'
import FinanceConnect from '@/components/FinanceConnect'
import FinanceSyncButton from '@/components/FinanceSyncButton'
import TransactionList, { type Transaction } from '@/components/TransactionList'
import SpendBarChart, { type DailySpend } from '@/components/SpendBarChart'
import CategoryBreakdown from '@/components/CategoryBreakdown'
import ManualAccountsSection, { type ManualAccount } from '@/components/ManualAccountsSection'
import VasteLastenPanel from '@/components/VasteLastenPanel'
import type { Category } from '@/lib/categorize'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  buildBankIbanSet,
  derivedBalance,
  isSelfTransfer,
  type ManualAccountRef,
  type TransactionRef,
} from '@/lib/finance'

interface BankAccountRow {
  id: string
  name: string | null
  iban: string | null
  currency: string | null
  last_synced_at: string | null
}

interface TransactionRow {
  id: string
  amount: number
  merchant: string | null
  category: string | null
  date: string
  counterparty_iban: string | null
  booked_at: string | null
  provider_sequence: number | null
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10)

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; connected?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const params = await searchParams
  const admin = createAdminClient()

  const [
    { data: accountsData },
    { data: txData },
    { data: manualData },
    { data: recurringData },
  ] = await Promise.all([
    admin
      .from('bank_accounts')
      .select('id, name, iban, currency, last_synced_at')
      .eq('user_id', user.id),
    supabase
      .from('transactions')
      .select(
        'id, amount, merchant, category, date, counterparty_iban, booked_at, provider_sequence'
      )
      // No date filter — category breakdown supports up to ALL-time view.
      // Other tiles still filter to their own windows in JS.
      .order('booked_at', { ascending: false, nullsFirst: false })
      .order('provider_sequence', { ascending: true, nullsFirst: false })
      .order('date', { ascending: false })
      .order('id', { ascending: false }),
    admin
      .from('manual_accounts')
      .select('id, name, iban, balance, currency, balance_set_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false }),
    admin
      .from('recurring_expenses')
      .select('id, name, amount, frequency, source, active')
      .eq('user_id', user.id)
      .order('amount', { ascending: false }),
  ])

  const accounts = (accountsData ?? []) as BankAccountRow[]
  const allTx = (txData ?? []) as TransactionRow[]
  const manualRefs = (manualData ?? []).map((m) => ({
    id: m.id as string,
    name: m.name as string,
    iban: (m.iban as string | null) ?? null,
    balance: Number(m.balance),
    balance_set_at: m.balance_set_at as string,
  })) satisfies ManualAccountRef[]

  // For self-transfer detection we also need the linked-bank IBANs.
  const bankIbans = buildBankIbanSet(accounts)

  // Manual recurring entries from /api/finance/recurring.
  const recurringEntries = ((recurringData ?? []) as Array<{
    id: string
    name: string
    amount: number
    frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
    source: string | null
    active: boolean
  }>).map((r) => ({
    ...r,
    amount: Number(r.amount),
  }))

  // Net worth = sum of derived balances across manual accounts.
  // (Linked-account balances are still out of scope until we wire /balances.)
  const netWorth = manualRefs.reduce(
    (s, m) => s + derivedBalance(m, allTx as TransactionRef[]),
    0
  )

  // Manual accounts as passed to the UI: balance replaced with the derived
  // running total, anchor retained as `_anchor` for the sub-line.
  const manualAccounts: (ManualAccount & { _anchor: number; _anchorAt: string })[] =
    manualRefs.map((m) => ({
      id: m.id,
      name: m.name,
      iban: m.iban,
      balance: derivedBalance(m, allTx as TransactionRef[]),
      currency: 'EUR',
      _anchor: m.balance,
      _anchorAt: m.balance_set_at,
    }))

  const today = startOfDay(new Date())
  const sevenDaysAgo = isoDate(new Date(today.getTime() - 7 * 86400000))
  const fourteenDaysAgo = isoDate(new Date(today.getTime() - 14 * 86400000))
  const thirtyDaysAgo = isoDate(new Date(today.getTime() - 30 * 86400000))

  const transactions: Transaction[] = allTx.map((t) => ({
    id: t.id,
    amount: Number(t.amount),
    merchant: t.merchant,
    category: t.category,
    date: t.date,
    is_transfer: isSelfTransfer(t as TransactionRef, manualRefs, bankIbans),
  }))

  const weekSpend = transactions
    .filter(
      (t) => t.date >= sevenDaysAgo && t.amount < 0 && !t.is_transfer
    )
    .reduce((s, t) => s + Math.abs(t.amount), 0)

  const monthSpend = transactions
    .filter(
      (t) => t.date >= thirtyDaysAgo && t.amount < 0 && !t.is_transfer
    )
    .reduce((s, t) => s + Math.abs(t.amount), 0)

  // Daily spend last 14 days (inclusive of today).
  const dailyMap = new Map<string, number>()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000)
    dailyMap.set(isoDate(d), 0)
  }
  for (const t of transactions) {
    if (t.date < fourteenDaysAgo || t.amount >= 0 || t.is_transfer) continue
    const key = t.date
    if (!dailyMap.has(key)) continue
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + Math.abs(t.amount))
  }
  const daily: DailySpend[] = Array.from(dailyMap.entries()).map(([date, spend]) => ({
    date,
    spend,
  }))

  // Display list: keep to last 30 days so the page doesn't become a wall.
  const transactionsForList = transactions.filter((t) => t.date >= thirtyDaysAgo)

  // Category breakdown receives ALL transactions (already excludes positive
  // amounts + transfers internally). Range selector is client-side.
  const categoryTransactions = transactions.filter(
    (t) => t.amount < 0 && !t.is_transfer
  )

  const lastSyncedAt = accounts.reduce<string | null>((latest, a) => {
    if (!a.last_synced_at) return latest
    if (!latest) return a.last_synced_at
    return a.last_synced_at > latest ? a.last_synced_at : latest
  }, null)

  return (
    <div className="min-h-screen bg-[#050d1c]">
      <TopNav />
      <main className="px-3 pb-12 md:px-5 max-w-6xl mx-auto" style={{ paddingTop: '3rem' }}>
        {/* Page header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-zinc-600 tracking-widest">06 //</span>
            <span className="text-[10px] text-zinc-500 tracking-[0.2em]">FINANCE</span>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-base text-zinc-100">Finance</h1>
            <Link
              href="/"
              className="text-[10px] text-zinc-600 hover:text-zinc-300 tracking-wider transition-colors"
            >
              ← HOME
            </Link>
          </div>
        </div>

        {/* Flash messages */}
        {params.connected && (
          <div className="mb-4 border border-accent/40 bg-accent/5 px-3 py-2 text-[11px] text-accent tracking-wider">
            Bank connected. Run a sync to load transactions.
          </div>
        )}
        {params.error && (
          <div className="mb-4 border border-red-500/40 bg-red-500/5 px-3 py-2 text-[11px] text-red-400 tracking-wider">
            {decodeURIComponent(params.error)}
          </div>
        )}

        <div className="flex flex-col gap-5">
          {/* Net worth + manual accounts always visible */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-3">
            <SummaryTile
              label="Net worth"
              amount={netWorth}
              hint={
                manualAccounts.length === 0
                  ? 'Add a manual account to start tracking.'
                  : `${manualAccounts.length} manual account${manualAccounts.length === 1 ? '' : 's'}`
              }
            />
            <div className="border border-slate-800 bg-[#0a1830] px-4 py-4">
              <ManualAccountsSection accounts={manualAccounts} />
            </div>
          </div>

          {accounts.length === 0 ? (
            <FinanceConnect />
          ) : (
            <>
              {/* Linked accounts strip + sync */}
              <div className="border border-slate-800 bg-[#0a1830] px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase">
                    Linked accounts
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {accounts.map((a) => (
                      <div key={a.id} className="text-xs text-zinc-300">
                        {a.name ?? 'Account'}{' '}
                        {a.iban && (
                          <span className="text-zinc-600 tabular-nums ml-1">
                            {a.iban.replace(/(.{4})/g, '$1 ').trim()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <FinanceSyncButton lastSyncedAt={lastSyncedAt} />
              </div>

              {/* Summary tiles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <SummaryTile label="Week spend" amount={weekSpend} hint="Last 7 days" />
                <SummaryTile label="Month spend" amount={monthSpend} hint="Last 30 days" />
              </div>

              {/* Bar chart */}
              <div className="border border-slate-800 bg-[#0a1830] px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase">
                    Daily spend · 14d
                  </p>
                  <p className="text-[10px] text-zinc-600 tracking-wider">
                    Excludes transfers
                  </p>
                </div>
                <SpendBarChart daily={daily} />
              </div>

              {/* Three-column bottom: breakdown · transactions · vaste lasten */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-3">
                <div className="border border-slate-800 bg-[#0a1830] px-4 py-4">
                  <CategoryBreakdown transactions={categoryTransactions} />
                </div>
                <div className="border border-slate-800 bg-[#0a1830] px-4 py-4">
                  <p className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase mb-3">
                    Transactions · last 30d
                  </p>
                  <TransactionList transactions={transactionsForList} />
                </div>
                <div className="border border-slate-800 bg-[#0a1830] px-4 py-4">
                  <VasteLastenPanel
                    transactions={allTx as TransactionRef[]}
                    manualEntries={recurringEntries}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function SummaryTile({
  label,
  amount,
  hint,
}: {
  label: string
  amount: number
  hint: string
}) {
  return (
    <div className="border border-slate-800 bg-[#0a1830] px-4 py-4">
      <p className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase">{label}</p>
      <p className="text-2xl text-zinc-100 tabular-nums mt-2">
        €{' '}
        {amount.toLocaleString('nl-NL', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </p>
      <p className="text-[10px] text-zinc-600 tracking-wider mt-1">{hint}</p>
    </div>
  )
}

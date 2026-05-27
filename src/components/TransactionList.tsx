import type { Category } from '@/lib/categorize'

export interface Transaction {
  id: string
  amount: number
  merchant: string | null
  category: string | null
  date: string
  is_transfer?: boolean
}

const CATEGORY_LABEL: Record<Category, string> = {
  groceries: 'GROCERIES',
  transport: 'TRANSPORT',
  'food-out': 'FOOD',
  subscriptions: 'SUBS',
  shopping: 'SHOPPING',
  entertainment: 'FUN',
  health: 'HEALTH',
  bills: 'BILLS',
  income: 'INCOME',
  transfer: 'TRANSFER',
  other: 'OTHER',
}

function formatAmount(n: number): string {
  const abs = Math.abs(n).toLocaleString('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${n < 0 ? '−' : '+'}€ ${abs}`
}

function formatDate(s: string): string {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  }).toUpperCase()
}

export default function TransactionList({
  transactions,
  emptyHint = 'No transactions yet. Hit Sync.',
}: {
  transactions: Transaction[]
  emptyHint?: string
}) {
  if (transactions.length === 0) {
    return <p className="text-xs text-zinc-700 py-6 text-center">{emptyHint}</p>
  }

  return (
    <ul className="flex flex-col">
      {transactions.map((t) => {
        const isTransfer = t.is_transfer || t.category === 'transfer'
        const cat = (t.category as Category) || 'other'
        const positive = t.amount >= 0

        return (
          <li
            key={t.id}
            className={`flex items-center gap-3 border-b border-slate-800 last:border-b-0 py-2.5 ${
              isTransfer ? 'opacity-50' : ''
            }`}
          >
            <span className="text-[10px] text-zinc-600 tracking-wider tabular-nums shrink-0 w-12">
              {formatDate(t.date)}
            </span>
            <span className="text-xs text-zinc-200 flex-1 truncate">
              {t.merchant ?? 'Unknown'}
            </span>
            <span
              className={`text-[9px] tracking-wider px-1.5 py-0.5 border shrink-0 ${
                isTransfer
                  ? 'border-slate-800 text-zinc-600'
                  : 'border-slate-700 text-zinc-500'
              }`}
            >
              {CATEGORY_LABEL[cat] ?? 'OTHER'}
            </span>
            <span
              className={`text-xs tabular-nums tracking-wider shrink-0 w-24 text-right ${
                isTransfer
                  ? 'text-zinc-600'
                  : positive
                  ? 'text-accent'
                  : 'text-zinc-300'
              }`}
            >
              {formatAmount(t.amount)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

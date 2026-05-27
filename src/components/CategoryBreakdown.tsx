import type { Category } from '@/lib/categorize'

export interface CategoryTotal {
  category: Category
  total: number // positive number
}

const LABEL: Record<Category, string> = {
  groceries: 'Groceries',
  transport: 'Transport',
  'food-out': 'Food out',
  subscriptions: 'Subscriptions',
  shopping: 'Shopping',
  entertainment: 'Entertainment',
  health: 'Health',
  bills: 'Bills',
  income: 'Income',
  transfer: 'Transfer',
  other: 'Other',
}

function fmt(n: number): string {
  return `€ ${n.toLocaleString('nl-NL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}

export default function CategoryBreakdown({ breakdown }: { breakdown: CategoryTotal[] }) {
  if (breakdown.length === 0) {
    return (
      <p className="text-xs text-zinc-700 py-3">No spending categorised yet.</p>
    )
  }
  const max = Math.max(1, ...breakdown.map((b) => b.total))

  return (
    <ul className="flex flex-col gap-2.5">
      {breakdown.map((b) => {
        const pct = (b.total / max) * 100
        return (
          <li key={b.category}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs text-zinc-300 truncate">{LABEL[b.category]}</span>
              <span className="text-[10px] text-zinc-500 tabular-nums shrink-0">
                {fmt(b.total)}
              </span>
            </div>
            <div className="h-0.5 bg-slate-800 relative overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-accent transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

import {
  detectRecurring,
  monthlyEquivalent,
  type DetectedRecurring,
  type RecurringFrequency,
  type TransactionRef,
} from '@/lib/finance'
import VasteLastenAddForm from './VasteLastenAddForm'
import VasteLastenRow, { type RecurringEntry } from './VasteLastenRow'

interface ManualEntry extends RecurringEntry {
  active: boolean
}

const FREQ_BADGE: Record<RecurringFrequency, string> = {
  weekly: 'WKLY',
  monthly: 'MTHLY',
  quarterly: 'QTRLY',
  yearly: 'YRLY',
}

function fmt(n: number, opts: Intl.NumberFormatOptions = {}): string {
  return `€ ${n.toLocaleString('nl-NL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...opts,
  })}`
}

function fmt2(n: number): string {
  return `€ ${n.toLocaleString('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export default function VasteLastenPanel({
  transactions,
  manualEntries,
}: {
  transactions: TransactionRef[]
  manualEntries: ManualEntry[]
}) {
  const detected = detectRecurring(transactions, 180)
  const active = manualEntries.filter((m) => m.active)

  const monthlyTotal =
    detected.reduce((s, d) => s + monthlyEquivalent(d.amount, d.frequency), 0) +
    active.reduce((s, m) => s + monthlyEquivalent(m.amount, m.frequency), 0)

  const totalCount = detected.length + active.length

  return (
    <div>
      <div className="mb-4">
        <p className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase">
          Vaste lasten
        </p>
        <p className="text-2xl text-zinc-100 tabular-nums mt-2">
          {fmt(monthlyTotal)}{' '}
          <span className="text-[10px] text-zinc-600 tracking-wider align-middle">
            /MO
          </span>
        </p>
      </div>

      {totalCount === 0 ? (
        <p className="text-xs text-zinc-700 py-2">
          No recurring expenses detected yet. Sync a few more weeks of data
          or add one manually.
        </p>
      ) : (
        <div className="flex flex-col">
          {detected.length > 0 && (
            <div>
              {detected.map((d) => (
                <DetectedRow key={`auto-${d.merchant}`} entry={d} />
              ))}
            </div>
          )}

          {active.length > 0 && (
            <div className={detected.length > 0 ? 'mt-3' : ''}>
              {detected.length > 0 && (
                <p className="text-[9px] text-zinc-700 tracking-widest mb-1">
                  MANUAL
                </p>
              )}
              {active.map((m) => (
                <VasteLastenRow key={m.id} entry={m} />
              ))}
            </div>
          )}
        </div>
      )}

      <VasteLastenAddForm />
    </div>
  )
}

function DetectedRow({ entry }: { entry: DetectedRecurring }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-slate-800 last:border-b-0">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-zinc-200 truncate">{entry.merchant}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[9px] tracking-wider text-zinc-500 border border-slate-800 px-1 py-px">
            {FREQ_BADGE[entry.frequency]}
          </span>
          <span className="text-[9px] tracking-wider text-accent/70">AUTO</span>
          <span className="text-[9px] tracking-wider text-zinc-700">
            ×{entry.occurrences}
          </span>
        </div>
      </div>
      <span className="text-xs text-zinc-200 tabular-nums shrink-0">
        {fmt2(entry.amount)}
      </span>
    </div>
  )
}

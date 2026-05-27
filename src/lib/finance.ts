/**
 * Shared finance logic — self-transfer detection and derived manual-account balance.
 * Single source of truth for /finance and the home page so they don't drift.
 */

export interface ManualAccountRef {
  id: string
  name: string
  iban: string | null
  balance: number // anchor value
  balance_set_at: string // ISO timestamp
}

export interface TransactionRef {
  amount: number
  merchant: string | null
  category: string | null
  counterparty_iban: string | null
  booked_at: string | null
  date?: string | null
}

function normalizeIban(s: string | null | undefined): string | null {
  if (!s) return null
  const n = s.replace(/\s+/g, '').toUpperCase()
  return n.length >= 8 ? n : null
}

export function buildBankIbanSet(
  bankAccounts: Array<{ iban: string | null }>
): Set<string> {
  const out = new Set<string>()
  for (const a of bankAccounts) {
    const n = normalizeIban(a.iban)
    if (n) out.add(n)
  }
  return out
}

/**
 * Returns the manual account this transaction transfers to/from, if any.
 * Match priority: IBAN first (most reliable), then case-insensitive name
 * substring on the merchant string. Names shorter than 4 chars are skipped
 * to avoid false positives on generic words.
 */
export function matchManualAccount(
  t: TransactionRef,
  manualAccounts: ManualAccountRef[]
): ManualAccountRef | null {
  const cpIban = normalizeIban(t.counterparty_iban)
  const merchantLower = (t.merchant ?? '').toLowerCase().trim()

  for (const m of manualAccounts) {
    const mIban = normalizeIban(m.iban)
    if (cpIban && mIban && cpIban === mIban) return m
  }
  for (const m of manualAccounts) {
    const name = m.name.toLowerCase().trim()
    if (name.length >= 4 && merchantLower.includes(name)) return m
  }
  return null
}

/**
 * Is this transaction a transfer between the user's own accounts?
 * - category === 'transfer' (categorizer hit), OR
 * - counterparty IBAN matches one of the user's known bank IBANs, OR
 * - the transaction matches one of the user's manual accounts.
 */
export function isSelfTransfer(
  t: TransactionRef,
  manualAccounts: ManualAccountRef[],
  bankIbans: Set<string>
): boolean {
  if (t.category === 'transfer') return true

  const cpIban = normalizeIban(t.counterparty_iban)
  if (cpIban && bankIbans.has(cpIban)) return true

  // Fallback for legacy rows without counterparty_iban: substring scan of
  // the merchant for any known own-IBAN string.
  if (!cpIban && t.merchant) {
    const m = t.merchant.replace(/\s+/g, '').toUpperCase()
    for (const ban of bankIbans) {
      if (m.includes(ban)) return true
    }
  }

  return matchManualAccount(t, manualAccounts) !== null
}

/**
 * Derived balance for a manual account =
 *   anchor balance + sum of transfers booked AFTER the anchor was set.
 *
 * Sign convention: transactions are stored from the *linked* account's
 * perspective. A debit there (amount < 0) means the manual account
 * *received* money, so the manual balance grows by abs(amount). Hence
 * delta = -t.amount.
 */
export function derivedBalance(
  manualAccount: ManualAccountRef,
  transactions: TransactionRef[]
): number {
  const anchorTs = manualAccount.balance_set_at
  let delta = 0
  for (const t of transactions) {
    if (!t.booked_at) continue
    if (t.booked_at <= anchorTs) continue
    if (matchManualAccount(t, [manualAccount]) !== manualAccount) continue
    delta += -t.amount
  }
  return manualAccount.balance + delta
}

/* -------------------- Recurring expense detection ---------------------- */

export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export interface DetectedRecurring {
  merchant: string
  amount: number
  frequency: RecurringFrequency
  lastSeen: string
  occurrences: number
  exampleCategory: string | null
}

interface FrequencyBand {
  freq: RecurringFrequency
  minDays: number
  maxDays: number
}

const FREQUENCY_BANDS: FrequencyBand[] = [
  { freq: 'monthly', minDays: 25, maxDays: 35 },
  { freq: 'quarterly', minDays: 80, maxDays: 100 },
  { freq: 'yearly', minDays: 350, maxDays: 380 },
]

function normalizeMerchant(s: string | null): string {
  return (s ?? '').trim().toLowerCase()
}

/**
 * Detect repeating outflows that look like subscriptions or fixed costs.
 * Conservative — better to miss a few than surface noise.
 */
export function detectRecurring(
  transactions: TransactionRef[],
  windowDays: number = 180
): DetectedRecurring[] {
  const cutoffMs = Date.now() - windowDays * 86400000
  const groups = new Map<string, TransactionRef[]>()

  for (const t of transactions) {
    if (t.amount >= 0) continue
    if (t.category === 'transfer') continue
    if (!t.merchant) continue
    const day = t.date ?? t.booked_at?.slice(0, 10)
    if (!day) continue
    const ms = new Date(day + 'T00:00:00Z').getTime()
    if (!Number.isFinite(ms) || ms < cutoffMs) continue

    const key = normalizeMerchant(t.merchant)
    if (!key) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(t)
  }

  const out: DetectedRecurring[] = []
  for (const [, txs] of groups) {
    if (txs.length < 2) continue

    const amounts = txs.map((t) => Math.abs(t.amount))
    const avgAmount = amounts.reduce((s, n) => s + n, 0) / amounts.length
    if (avgAmount <= 0) continue

    const variance = (Math.max(...amounts) - Math.min(...amounts)) / avgAmount
    if (variance > 0.2) continue

    const days = txs
      .map((t) => t.date ?? t.booked_at?.slice(0, 10))
      .filter((d): d is string => !!d)
      .sort()
    if (days.length < 2) continue

    const gaps: number[] = []
    for (let i = 1; i < days.length; i++) {
      const a = new Date(days[i - 1] + 'T00:00:00Z').getTime()
      const b = new Date(days[i] + 'T00:00:00Z').getTime()
      gaps.push((b - a) / 86400000)
    }
    const avgGap = gaps.reduce((s, n) => s + n, 0) / gaps.length

    const band = FREQUENCY_BANDS.find(
      (b) => avgGap >= b.minDays && avgGap <= b.maxDays
    )
    if (!band) continue

    // Pick a representative merchant string (the most recent transaction's).
    const sorted = [...txs].sort((a, b) =>
      (a.date ?? '').localeCompare(b.date ?? '')
    )
    const latest = sorted[sorted.length - 1]

    out.push({
      merchant: latest.merchant ?? '',
      amount: Math.round(avgAmount * 100) / 100,
      frequency: band.freq,
      lastSeen: days[days.length - 1],
      occurrences: txs.length,
      exampleCategory: latest.category,
    })
  }

  return out.sort((a, b) => b.amount - a.amount)
}

/**
 * Normalise any frequency to a per-month amount, so totals across mixed
 * frequencies are directly comparable.
 */
export function monthlyEquivalent(
  amount: number,
  frequency: RecurringFrequency
): number {
  switch (frequency) {
    case 'weekly':
      return amount * (52 / 12)
    case 'monthly':
      return amount
    case 'quarterly':
      return amount / 3
    case 'yearly':
      return amount / 12
  }
}

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

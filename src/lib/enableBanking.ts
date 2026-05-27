import jwt from 'jsonwebtoken'

const BASE = 'https://api.enablebanking.com'

/* ----------------------------- Types ---------------------------------- */

export interface ASPSP {
  name: string
  country: string
  logo?: string
  psu_types?: string[]
}

export interface AccountIdRef {
  iban?: string
  bban?: string
  bic?: string
  other?: { identification: string }
}

export interface Account {
  uid: string
  identification_hash?: string
  account_id?: AccountIdRef
  name?: string
  product?: string
  currency?: string
  usage?: string
  cash_account_type?: string
}

export interface AuthSession {
  session_id: string
  accounts: Account[]
  access?: {
    valid_until?: string
    accounts?: Array<{ iban?: string; other?: { identification?: string } }>
  }
  aspsp?: ASPSP
}

export interface Balance {
  name?: string
  balance_amount: { amount: string; currency: string }
  balance_type?: string
  reference_date?: string
}

export interface EBTransaction {
  entry_reference?: string
  transaction_id?: string
  merchant_category_code?: string
  transaction_date?: string
  booking_date?: string
  value_date?: string
  transaction_amount: { amount: string; currency: string }
  creditor?: { name?: string }
  creditor_account?: AccountIdRef
  debtor?: { name?: string }
  debtor_account?: AccountIdRef
  remittance_information?: string[]
  credit_debit_indicator?: 'CRDT' | 'DBIT'
  status?: 'BOOK' | 'PDNG' | 'INFO'
}

/* ----------------------------- JWT ------------------------------------ */

let cached: { token: string; exp: number } | null = null

function normalizePem(raw: string): string {
  let key = raw.trim()
  // Strip a single pair of surrounding double or single quotes if present.
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1)
  }
  // Convert literal \n into real newlines (Vercel UI sometimes stores them this way).
  if (key.includes('\\n')) {
    key = key.replace(/\\n/g, '\n')
  }
  return key
}

function getJwt(): string {
  const appId = process.env.ENABLE_BANKING_APP_ID
  const rawKey = process.env.ENABLE_BANKING_PRIVATE_KEY
  if (!appId || !rawKey) {
    throw new Error(
      'ENABLE_BANKING_APP_ID or ENABLE_BANKING_PRIVATE_KEY env var missing'
    )
  }
  const privateKey = normalizePem(rawKey)
  if (!privateKey.includes('BEGIN') || !privateKey.includes('PRIVATE KEY')) {
    throw new Error(
      'ENABLE_BANKING_PRIVATE_KEY does not look like a PEM key. ' +
        'Make sure the value includes the -----BEGIN PRIVATE KEY----- and ' +
        '-----END PRIVATE KEY----- markers with real newlines between lines.'
    )
  }

  const now = Math.floor(Date.now() / 1000)
  if (cached && cached.exp - 60 > now) return cached.token

  const exp = now + 3600
  const token = jwt.sign(
    {
      iss: 'enablebanking.com',
      aud: 'api.enablebanking.com',
      iat: now,
      exp,
    },
    privateKey,
    {
      algorithm: 'RS256',
      header: {
        typ: 'JWT',
        alg: 'RS256',
        kid: appId,
      },
    }
  )
  cached = { token, exp }
  return token
}

/* ----------------------------- HTTP ----------------------------------- */

async function eb<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getJwt()}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(
      `Enable Banking ${method} ${path} → ${res.status}: ${text || res.statusText}`
    )
  }
  return text ? (JSON.parse(text) as T) : (undefined as T)
}

/* ---------------------------- API calls ------------------------------- */

export interface ASPSPListItem {
  name: string
  country: string
  logo?: string
}

let aspspCache: { items: ASPSPListItem[]; exp: number } | null = null

export async function listASPSPs(country: string): Promise<ASPSPListItem[]> {
  const now = Date.now()
  if (aspspCache && aspspCache.exp > now) return aspspCache.items
  const data = await eb<{ aspsps: ASPSPListItem[] }>(
    'GET',
    `/aspsps?country=${encodeURIComponent(country)}`
  )
  aspspCache = { items: data.aspsps, exp: now + 60 * 60 * 1000 }
  return data.aspsps
}

export async function findRabobankNL(): Promise<ASPSPListItem> {
  const items = await listASPSPs('NL')
  const rabo = items.find(
    (a) =>
      /rabobank/i.test(a.name) &&
      !/business/i.test(a.name) &&
      !/zakelijk/i.test(a.name)
  )
  if (!rabo) {
    const personal = items.find((a) => /rabobank/i.test(a.name))
    if (personal) return personal
    throw new Error('Rabobank not found in Enable Banking NL institutions list')
  }
  return rabo
}

export interface StartAuthInput {
  aspspName: string
  aspspCountry: string
  redirectUrl: string
  state: string
  validUntilDays?: number
  psuType?: 'personal' | 'business'
}

export interface StartAuthResponse {
  url: string
  authorization_id: string
}

export async function startAuthorization(
  input: StartAuthInput
): Promise<StartAuthResponse> {
  const validUntil = new Date()
  validUntil.setDate(validUntil.getDate() + (input.validUntilDays ?? 180))
  return eb<StartAuthResponse>('POST', '/auth', {
    access: { valid_until: validUntil.toISOString() },
    aspsp: { name: input.aspspName, country: input.aspspCountry },
    psu_type: input.psuType ?? 'personal',
    redirect_url: input.redirectUrl,
    state: input.state,
  })
}

export async function createSession(code: string): Promise<AuthSession> {
  return eb<AuthSession>('POST', '/sessions', { code })
}

export async function getSession(sessionId: string): Promise<AuthSession> {
  return eb<AuthSession>('GET', `/sessions/${sessionId}`)
}

export async function getAccountTransactions(
  accountId: string,
  dateFrom: string
): Promise<{ transactions: EBTransaction[]; continuation_key?: string }> {
  return eb<{ transactions: EBTransaction[]; continuation_key?: string }>(
    'GET',
    `/accounts/${accountId}/transactions?date_from=${dateFrom}`
  )
}

export async function getAccountBalances(
  accountId: string
): Promise<{ balances: Balance[] }> {
  return eb<{ balances: Balance[] }>('GET', `/accounts/${accountId}/balances`)
}

/* --------------------------- Helpers ---------------------------------- */

/**
 * Extract a merchant-ish display string from a transaction.
 * Prefers explicit creditor / debtor name, falls back to remittance text.
 */
export function describeTransaction(t: EBTransaction): string {
  const isDebit = t.credit_debit_indicator === 'DBIT'
  const counterpartyName = isDebit ? t.creditor?.name : t.debtor?.name
  if (counterpartyName) return counterpartyName.trim()
  const remittance = (t.remittance_information ?? []).join(' ').trim()
  if (remittance) return remittance
  return 'Unknown'
}

/**
 * Signed numeric amount in account currency.
 * Negative for outflows (DBIT), positive for inflows (CRDT).
 */
export function signedAmount(t: EBTransaction): number {
  const n = Number(t.transaction_amount.amount)
  if (!Number.isFinite(n)) return 0
  return t.credit_debit_indicator === 'DBIT' ? -Math.abs(n) : Math.abs(n)
}

/**
 * Stable provider transaction id used as the upsert key in our transactions table.
 * Falls back across the fields Enable Banking exposes.
 */
export function providerTransactionId(t: EBTransaction): string | null {
  return (
    t.transaction_id ??
    t.entry_reference ??
    null
  )
}

/**
 * Pull an IBAN from a transaction's counterparty account, if present.
 * Used by the self-transfer filter on the finance page.
 */
export function counterpartyIban(t: EBTransaction): string | null {
  const isDebit = t.credit_debit_indicator === 'DBIT'
  const acct = isDebit ? t.creditor_account : t.debtor_account
  return acct?.iban ?? null
}

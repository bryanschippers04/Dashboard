import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getAccountTransactions,
  describeTransaction,
  signedAmount,
  providerTransactionId,
} from '@/lib/enableBanking'
import { categorizeTransaction } from '@/lib/categorize'
import { NextResponse } from 'next/server'

interface AccountResult {
  account_id: string
  inserted: number
  skipped: number
  error?: string
}

const NINETY_DAYS_AGO = () => {
  const d = new Date()
  d.setDate(d.getDate() - 90)
  return d.toISOString().slice(0, 10)
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: accounts, error: accErr } = await admin
    .from('bank_accounts')
    .select('id, account_id, last_synced_at')
    .eq('user_id', user.id)

  if (accErr) {
    return NextResponse.json({ error: accErr.message }, { status: 500 })
  }
  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ error: 'No linked accounts' }, { status: 400 })
  }

  const results: AccountResult[] = []

  for (const account of accounts) {
    const result: AccountResult = {
      account_id: account.account_id,
      inserted: 0,
      skipped: 0,
    }

    try {
      const dateFrom = account.last_synced_at
        ? new Date(account.last_synced_at).toISOString().slice(0, 10)
        : NINETY_DAYS_AGO()

      const { transactions } = await getAccountTransactions(account.account_id, dateFrom)

      const rows = transactions
        .map((t) => {
          const providerId = providerTransactionId(t)
          if (!providerId) return null
          const merchant = describeTransaction(t)
          const remittance = (t.remittance_information ?? []).join(' ')
          const category = categorizeTransaction({ merchant, remittance })
          const date =
            t.booking_date ?? t.value_date ?? t.transaction_date ?? null
          return {
            user_id: user.id,
            amount: signedAmount(t),
            merchant,
            category,
            date,
            plaid_id: providerId,
          }
        })
        .filter((r): r is NonNullable<typeof r> => r !== null && r.date !== null)

      if (rows.length > 0) {
        const { error: upsertErr, count } = await admin
          .from('transactions')
          .upsert(rows, { onConflict: 'plaid_id', count: 'exact' })

        if (upsertErr) {
          result.error = upsertErr.message
        } else {
          result.inserted = count ?? rows.length
        }
      }

      await admin
        .from('bank_accounts')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', account.id)
    } catch (err) {
      result.error = err instanceof Error ? err.message : 'sync_failed'
    }

    results.push(result)
  }

  const totalInserted = results.reduce((sum, r) => sum + r.inserted, 0)
  return NextResponse.json({ total: totalInserted, results })
}

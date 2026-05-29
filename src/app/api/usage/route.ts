import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { usdToEur } from '@/lib/pricing'

interface UsageRow {
  endpoint: string
  cost_usd: number | string
  input_tokens: number
  output_tokens: number
  model: string
  created_at: string
}

interface EndpointTotal {
  endpoint: string
  cost_usd: number
  calls: number
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('api_usage')
    .select('endpoint, cost_usd, input_tokens, output_tokens, model, created_at')
    .eq('user_id', user.id)
  if (error) { console.error('api_usage query failed:', error.message); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }

  const rows = ((data ?? []) as UsageRow[]).map((r) => ({
    ...r,
    cost_usd: Number(r.cost_usd),
  }))

  const now = Date.now()
  const sevenDaysAgoMs = now - 7 * 86400000
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const monthStartMs = monthStart.getTime()

  let total = 0
  let month = 0
  let week = 0
  let totalInput = 0
  let totalOutput = 0
  const byEndpoint = new Map<string, EndpointTotal>()
  const modelCounts = new Map<string, number>()

  for (const r of rows) {
    const ts = new Date(r.created_at).getTime()
    total += r.cost_usd
    totalInput += r.input_tokens
    totalOutput += r.output_tokens
    if (ts >= monthStartMs) month += r.cost_usd
    if (ts >= sevenDaysAgoMs) week += r.cost_usd

    const ep = byEndpoint.get(r.endpoint) ?? {
      endpoint: r.endpoint,
      cost_usd: 0,
      calls: 0,
    }
    ep.cost_usd += r.cost_usd
    ep.calls += 1
    byEndpoint.set(r.endpoint, ep)

    modelCounts.set(r.model, (modelCounts.get(r.model) ?? 0) + 1)
  }

  const breakdown = Array.from(byEndpoint.values()).sort(
    (a, b) => b.cost_usd - a.cost_usd
  )

  const dominantModel =
    Array.from(modelCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  return NextResponse.json({
    total_eur: round(usdToEur(total), 8),
    month_eur: round(usdToEur(month), 8),
    week_eur: round(usdToEur(week), 8),
    calls: rows.length,
    input_tokens: totalInput,
    output_tokens: totalOutput,
    model: dominantModel,
    by_endpoint: breakdown.map((b) => ({
      endpoint: b.endpoint,
      cost_eur: round(usdToEur(b.cost_usd), 8),
      calls: b.calls,
    })),
  })
}

function round(n: number, decimals: number): number {
  const p = 10 ** decimals
  return Math.round(n * p) / p
}

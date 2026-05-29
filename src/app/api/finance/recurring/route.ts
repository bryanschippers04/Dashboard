import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const VALID_FREQ = ['weekly', 'monthly', 'quarterly', 'yearly'] as const
type Frequency = (typeof VALID_FREQ)[number]

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

function parseAmount(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}

export async function GET() {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('recurring_expenses')
    .select('id, name, amount, currency, frequency, source, active, created_at')
    .eq('user_id', user.id)
    .order('amount', { ascending: false })

  if (error) { console.error('recurring_expenses query failed:', error.message); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, amount, frequency, source } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 })
  }
  const amt = parseAmount(amount)
  if (amt === null) {
    return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
  }
  if (!VALID_FREQ.includes(frequency as Frequency)) {
    return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('recurring_expenses')
    .insert({
      user_id: user.id,
      name: name.trim(),
      amount: amt,
      frequency,
      source: typeof source === 'string' && source.trim() ? source.trim() : null,
    })
    .select()
    .single()

  if (error) { console.error('recurring_expenses query failed:', error.message); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: Request) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, name, amount, frequency, source, active } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (typeof name === 'string' && name.trim()) update.name = name.trim()
  if (amount !== undefined) {
    const amt = parseAmount(amount)
    if (amt === null) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
    }
    update.amount = amt
  }
  if (frequency !== undefined) {
    if (!VALID_FREQ.includes(frequency as Frequency)) {
      return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 })
    }
    update.frequency = frequency
  }
  if (source !== undefined) {
    update.source = typeof source === 'string' && source.trim() ? source.trim() : null
  }
  if (typeof active === 'boolean') update.active = active

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('recurring_expenses')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) { console.error('recurring_expenses query failed:', error.message); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('recurring_expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) { console.error('recurring_expenses query failed:', error.message); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }
  return NextResponse.json({ success: true })
}

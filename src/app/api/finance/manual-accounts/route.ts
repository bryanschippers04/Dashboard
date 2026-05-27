import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

function parseBalance(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100) / 100
}

export async function GET() {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('manual_accounts')
    .select('id, name, iban, balance, currency, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, iban, balance, currency } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 })
  }
  const balanceNum = parseBalance(balance)
  if (balanceNum === null) {
    return NextResponse.json({ error: 'Balance must be a number' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('manual_accounts')
    .insert({
      user_id: user.id,
      name: name.trim(),
      iban: typeof iban === 'string' && iban.trim() ? iban.trim() : null,
      balance: balanceNum,
      currency: typeof currency === 'string' && currency.trim() ? currency.trim() : 'EUR',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: Request) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, name, iban, balance } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof name === 'string' && name.trim()) update.name = name.trim()
  if (typeof iban === 'string') update.iban = iban.trim() || null
  if (balance !== undefined) {
    const balanceNum = parseBalance(balance)
    if (balanceNum === null) {
      return NextResponse.json({ error: 'Balance must be a number' }, { status: 400 })
    }
    update.balance = balanceNum
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('manual_accounts')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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
    .from('manual_accounts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

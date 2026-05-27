import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const VALID_TYPES = ['daily', 'weekly', 'monthly'] as const
type GoalType = (typeof VALID_TYPES)[number]

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .order('type', { ascending: true })
    .order('current_progress', { ascending: true })
    .order('id', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { title, type, target } = body

  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 })
  }
  if (!VALID_TYPES.includes(type as GoalType)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }
  const targetNum = Number(target)
  if (!Number.isInteger(targetNum) || targetNum < 1) {
    return NextResponse.json({ error: 'Target must be a positive integer' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id: user.id,
      title: title.trim(),
      type,
      target: targetNum,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { id, current_progress } = body

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const clamped = Math.max(0, Math.floor(Number(current_progress)))

  const { data, error } = await supabase
    .from('goals')
    .update({ current_progress: clamped })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase.from('goals').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

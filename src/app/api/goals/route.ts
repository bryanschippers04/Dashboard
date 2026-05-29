import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/apiAuth'

const MAX_TITLE = 500
const MAX_TARGET = 100_000
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function GET() {
  const auth = await requireUser()
  if (auth instanceof NextResponse) return auth
  const { supabase, user } = auth

  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .order('deadline', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true })

  if (error) {
    console.error('goals GET failed:', error.message)
    return NextResponse.json({ error: 'Failed to load goals' }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const auth = await requireUser()
  if (auth instanceof NextResponse) return auth
  const { supabase, user } = auth

  const body = await request.json().catch(() => ({}))
  const { title, deadline, target } = body as {
    title?: unknown
    deadline?: unknown
    target?: unknown
  }

  if (typeof title !== 'string' || !title.trim() || title.length > MAX_TITLE) {
    return NextResponse.json({ error: 'Title required (max 500 chars)' }, { status: 400 })
  }
  let deadlineValue: string | null = null
  if (deadline !== undefined && deadline !== null && deadline !== '') {
    if (typeof deadline !== 'string' || !DATE_RE.test(deadline)) {
      return NextResponse.json({ error: 'deadline must be YYYY-MM-DD' }, { status: 400 })
    }
    deadlineValue = deadline
  }
  const targetNum = Number(target)
  if (!Number.isInteger(targetNum) || targetNum < 1 || targetNum > MAX_TARGET) {
    return NextResponse.json({ error: 'Target must be a positive integer' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id: user.id,
      title: title.trim(),
      deadline: deadlineValue,
      target: targetNum,
    })
    .select()
    .single()

  if (error) {
    console.error('goals POST failed:', error.message)
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: Request) {
  const auth = await requireUser()
  if (auth instanceof NextResponse) return auth
  const { supabase, user } = auth

  const body = await request.json().catch(() => ({}))
  const { id, current_progress } = body as { id?: unknown; current_progress?: unknown }

  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }
  const n = Number(current_progress)
  if (!Number.isFinite(n)) {
    return NextResponse.json({ error: 'current_progress must be a number' }, { status: 400 })
  }
  const clamped = Math.max(0, Math.min(MAX_TARGET, Math.floor(n)))

  const { data, error } = await supabase
    .from('goals')
    .update({ current_progress: clamped })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('goals PATCH failed:', error.message)
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const auth = await requireUser()
  if (auth instanceof NextResponse) return auth
  const { supabase, user } = auth

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('goals DELETE failed:', error.message)
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

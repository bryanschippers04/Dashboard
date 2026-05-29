import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/apiAuth'

const MAX_TITLE = 500

export async function GET() {
  const auth = await requireUser()
  if (auth instanceof NextResponse) return auth
  const { supabase, user } = auth

  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('user_id', user.id)
    .order('completed', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('todos GET failed:', error.message)
    return NextResponse.json({ error: 'Failed to load todos' }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const auth = await requireUser()
  if (auth instanceof NextResponse) return auth
  const { supabase, user } = auth

  const body = await request.json().catch(() => ({}))
  const { title, due_date } = body as { title?: unknown; due_date?: unknown }

  if (typeof title !== 'string' || !title.trim() || title.length > MAX_TITLE) {
    return NextResponse.json({ error: 'Title required (max 500 chars)' }, { status: 400 })
  }
  let dueDateValue: string | null = null
  if (typeof due_date === 'string' && due_date.trim()) {
    const t = Date.parse(due_date)
    if (Number.isNaN(t)) {
      return NextResponse.json({ error: 'Invalid due_date' }, { status: 400 })
    }
    dueDateValue = due_date
  }

  const { data, error } = await supabase
    .from('todos')
    .insert({
      user_id: user.id,
      title: title.trim(),
      due_date: dueDateValue,
    })
    .select()
    .single()

  if (error) {
    console.error('todos POST failed:', error.message)
    return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: Request) {
  const auth = await requireUser()
  if (auth instanceof NextResponse) return auth
  const { supabase, user } = auth

  const body = await request.json().catch(() => ({}))
  const { id, completed } = body as { id?: unknown; completed?: unknown }

  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }
  if (typeof completed !== 'boolean') {
    return NextResponse.json({ error: 'completed must be boolean' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('todos')
    .update({ completed })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('todos PATCH failed:', error.message)
    return NextResponse.json({ error: 'Failed to update todo' }, { status: 500 })
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
    .from('todos')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('todos DELETE failed:', error.message)
    return NextResponse.json({ error: 'Failed to delete todo' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

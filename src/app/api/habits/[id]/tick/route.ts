import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { currentPeriodKey, type Cadence } from '@/lib/habits'

interface Ctx { params: Promise<{ id: string }> }

async function loadCadence(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  userId: string
): Promise<Cadence> {
  const { data, error } = await supabase
    .from('habits')
    .select('cadence')
    .eq('id', id)
    .eq('user_id', userId)
    .single()
  if (error) throw new Error(error.message)
  return data.cadence as Cadence
}

export async function POST(_req: Request, { params }: Ctx) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const cadence = await loadCadence(supabase, id, user.id)
    const periodKey = currentPeriodKey(cadence)
    const { error } = await supabase
      .from('habit_completions')
      .insert({ habit_id: id, user_id: user.id, period_key: periodKey })
    if (error) { console.error('habit_completions write failed:', error.message); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }
    return NextResponse.json({ ticked: id, period_key: periodKey })
  } catch (e) {
    console.error('habit tick failed:', e)
    return NextResponse.json(
      { error: 'Failed' },
      { status: 500 }
    )
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  // Untick: remove the most recent completion for THIS habit in the
  // current period.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const cadence = await loadCadence(supabase, id, user.id)
    const periodKey = currentPeriodKey(cadence)
    const { data: rows } = await supabase
      .from('habit_completions')
      .select('id')
      .eq('habit_id', id)
      .eq('user_id', user.id)
      .eq('period_key', periodKey)
      .order('occurred_at', { ascending: false })
      .limit(1)
    const row = (rows ?? [])[0] as { id: string } | undefined
    if (!row) return NextResponse.json({ unticked: id, removed: 0 })
    const { error } = await supabase
      .from('habit_completions')
      .delete()
      .eq('id', row.id)
      .eq('user_id', user.id)
    if (error) { console.error('habit_completions write failed:', error.message); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }
    return NextResponse.json({ unticked: id, removed: 1, period_key: periodKey })
  } catch (e) {
    console.error('habit tick failed:', e)
    return NextResponse.json(
      { error: 'Failed' },
      { status: 500 }
    )
  }
}

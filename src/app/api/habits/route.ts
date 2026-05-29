import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getHabitsWithProgress } from '@/lib/habitsServer'
import type { Cadence } from '@/lib/habits'

const VALID_CADENCES: Cadence[] = ['daily', 'weekly', 'monthly']

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  try {
    const habits = await getHabitsWithProgress(admin, user.id)
    return NextResponse.json({ habits })
  } catch (e) {
    console.error('habits GET failed:', e)
    return NextResponse.json(
      { error: 'Failed to load habits' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as {
    title?: unknown
    cadence?: unknown
    target_count?: unknown
  }
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })
  const cadence =
    typeof body.cadence === 'string' && (VALID_CADENCES as string[]).includes(body.cadence)
      ? (body.cadence as Cadence)
      : null
  if (!cadence)
    return NextResponse.json({ error: 'cadence must be daily|weekly|monthly' }, { status: 400 })
  const target_count =
    typeof body.target_count === 'number' && body.target_count >= 1
      ? Math.floor(body.target_count)
      : 1

  const { data, error } = await supabase
    .from('habits')
    .insert({ user_id: user.id, title, cadence, target_count })
    .select('id, title, cadence, target_count, active, sort_order')
    .single()
  if (error) { console.error('habits query failed:', error.message); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }
  return NextResponse.json(data, { status: 201 })
}

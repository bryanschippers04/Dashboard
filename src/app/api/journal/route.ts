import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { compactJournal } from '@/lib/compactJournal'
import { recordUsage } from '@/lib/usage'
import { getUserModelOverrides } from '@/lib/models'

export const maxDuration = 30

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', user.id)
    .order('timestamp', { ascending: false })

  if (error) {
    console.error('journal GET failed:', error.message)
    return NextResponse.json({ error: 'Failed to load journal' }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    text,
    rating,
    mood_tags,
    language,
    sleep_minutes,
    energy,
    productivity,
    exercise,
    time_outside,
    phone_time_minutes,
  } = body
  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'text required' }, { status: 400 })
  }

  const TIME_OUTSIDE_OPTIONS = new Set(['none', '<30m', '30-60m', '1h+'])
  const normalizedTimeOutside =
    typeof time_outside === 'string' && TIME_OUTSIDE_OPTIONS.has(time_outside)
      ? time_outside
      : null
  const normalizedSleep =
    typeof sleep_minutes === 'number' && sleep_minutes >= 0 && sleep_minutes <= 1440
      ? Math.round(sleep_minutes)
      : null
  const normalizedPhone =
    typeof phone_time_minutes === 'number' &&
    phone_time_minutes >= 0 &&
    phone_time_minutes <= 1440
      ? Math.round(phone_time_minutes)
      : null
  const clamp10 = (n: unknown) =>
    typeof n === 'number' && n >= 0 && n <= 10 ? Math.round(n) : null

  // Compact via Claude. Failure is non-fatal — we still save the raw
  // entry, just without a compact view.
  let textCompact: string | null = null
  try {
    const admin = createAdminClient()
    const prefs = await getUserModelOverrides(admin, user.id)
    const result = await compactJournal(text.trim(), {
      modelOverride: prefs.journal_compact,
    })
    textCompact = result.bullets.join('\n')
    await recordUsage(admin, user.id, '/api/journal', result.usage)
  } catch (e) {
    console.error('compactJournal failed:', e)
  }

  const { data, error } = await supabase
    .from('journal_entries')
    .insert({
      user_id: user.id,
      text: text.trim(),
      text_compact: textCompact,
      rating: rating ?? null,
      mood_tags: mood_tags ?? null,
      language: language ?? 'nl-NL',
      sleep_minutes: normalizedSleep,
      energy: clamp10(energy),
      productivity: clamp10(productivity),
      exercise:
        typeof exercise === 'string' && exercise.trim()
          ? exercise.trim()
          : null,
      time_outside: normalizedTimeOutside,
      phone_time_minutes: normalizedPhone,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('journal DELETE failed:', error.message)
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

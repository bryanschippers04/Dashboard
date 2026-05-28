import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { compactJournal } from '@/lib/compactJournal'
import { recordUsage } from '@/lib/usage'

export const maxDuration = 30

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .order('timestamp', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { text, rating, mood_tags, language } = body
  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'text required' }, { status: 400 })
  }

  // Compact via Claude. Failure is non-fatal — we still save the raw
  // entry, just without a compact view.
  let textCompact: string | null = null
  try {
    const result = await compactJournal(text.trim())
    textCompact = result.bullets.join('\n')
    const admin = createAdminClient()
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
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

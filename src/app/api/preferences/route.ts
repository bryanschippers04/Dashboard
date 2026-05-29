import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getUserModelOverrides,
  modelFor,
  type ModelCategory,
} from '@/lib/models'

const CATEGORIES: ModelCategory[] = [
  'assistant',
  'insights_weekly',
  'insights_daily',
  'journal_compact',
]

const FIELD_BY_CATEGORY: Record<ModelCategory, string> = {
  assistant: 'model_assistant',
  insights_weekly: 'model_insights_weekly',
  insights_daily: 'model_insights_daily',
  journal_compact: 'model_journal_compact',
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const overrides = await getUserModelOverrides(admin, user.id)
  // Resolve to the effective model id per category, so the UI can show
  // exactly what each task is using right now (override OR env OR default).
  const resolved: Record<ModelCategory, string> = {
    assistant: modelFor('assistant', overrides.assistant),
    insights_weekly: modelFor('insights_weekly', overrides.insights_weekly),
    insights_daily: modelFor('insights_daily', overrides.insights_daily),
    journal_compact: modelFor('journal_compact', overrides.journal_compact),
  }
  return NextResponse.json({ overrides, resolved })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const updates: Record<string, string | null> = { user_id: user.id }
  let touched = false
  for (const cat of CATEGORIES) {
    const v = body[cat]
    if (v === undefined) continue
    if (v === null) {
      updates[FIELD_BY_CATEGORY[cat]] = null
      touched = true
    } else if (typeof v === 'string' && v.trim()) {
      updates[FIELD_BY_CATEGORY[cat]] = v.trim()
      touched = true
    }
  }
  if (!touched) {
    return NextResponse.json(
      { error: 'No valid fields in body' },
      { status: 400 }
    )
  }
  updates.updated_at = new Date().toISOString()

  const admin = createAdminClient()
  const { error } = await admin
    .from('user_preferences')
    .upsert(updates, { onConflict: 'user_id' })
  if (error) { console.error('preferences upsert failed:', error.message); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }

  const overrides = await getUserModelOverrides(admin, user.id)
  return NextResponse.json({ overrides })
}

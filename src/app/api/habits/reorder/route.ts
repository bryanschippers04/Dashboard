import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { ids?: unknown }
  if (
    !Array.isArray(body.ids) ||
    body.ids.length === 0 ||
    !body.ids.every((v) => typeof v === 'string')
  ) {
    return NextResponse.json({ error: 'ids must be a non-empty string[]' }, { status: 400 })
  }
  const ids = body.ids as string[]

  const updates = await Promise.all(
    ids.map((id, i) =>
      supabase
        .from('habits')
        .update({ sort_order: (i + 1) * 10 })
        .eq('id', id)
        .eq('user_id', user.id)
    )
  )
  const failed = updates.find((r) => r.error)
  if (failed?.error) {
    console.error('habits reorder failed:', failed.error.message)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
  return NextResponse.json({ success: true, count: ids.length })
}

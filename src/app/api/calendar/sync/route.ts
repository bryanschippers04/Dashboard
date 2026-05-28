import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncCalendarEvents } from '@/lib/calendarServer'

export const maxDuration = 30

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const result = await syncCalendarEvents(user.id)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Sync failed' },
      { status: 502 }
    )
  }
}

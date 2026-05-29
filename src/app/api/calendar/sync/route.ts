import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncCalendarEvents } from '@/lib/calendarServer'
import { hitRateLimit } from '@/lib/rateLimit'

export const maxDuration = 30

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rate = await hitRateLimit(user.id, 'calendar_sync')
  if (!rate.ok) return rate.response

  try {
    const result = await syncCalendarEvents(user.id)
    return NextResponse.json(result)
  } catch (e) {
    console.error('calendar sync failed:', e)
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 502 }
    )
  }
}

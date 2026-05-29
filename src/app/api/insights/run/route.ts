import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runAndStoreWeekly } from '@/lib/insightsServer'
import { hitRateLimit } from '@/lib/rateLimit'

export const maxDuration = 60

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rate = await hitRateLimit(user.id, 'insights_weekly')
  if (!rate.ok) return rate.response

  try {
    const result = await runAndStoreWeekly(user.id)
    return NextResponse.json(result)
  } catch (e) {
    console.error('weekly insights run failed:', e)
    return NextResponse.json(
      { error: 'Weekly run failed' },
      { status: 502 }
    )
  }
}

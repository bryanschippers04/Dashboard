import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runAndStoreDaily } from '@/lib/insightsServer'
import { hitRateLimit } from '@/lib/rateLimit'

export const maxDuration = 60

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rate = await hitRateLimit(user.id, 'insights_daily')
  if (!rate.ok) return rate.response

  try {
    const result = await runAndStoreDaily(user.id)
    return NextResponse.json(result)
  } catch (e) {
    console.error('daily insights run failed:', e)
    return NextResponse.json(
      { error: 'Daily run failed' },
      { status: 502 }
    )
  }
}

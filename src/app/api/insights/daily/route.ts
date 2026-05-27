import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runAndStoreDaily } from '@/lib/insightsServer'

export const maxDuration = 60

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const result = await runAndStoreDaily(user.id)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Daily run failed' },
      { status: 502 }
    )
  }
}

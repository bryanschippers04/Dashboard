import { NextResponse } from 'next/server'
import { runAndStoreWeekly } from '@/lib/insightsServer'

export const maxDuration = 60

// Vercel cron entry. Vercel signs cron requests with
// `Authorization: Bearer ${CRON_SECRET}`. We also support GET
// because Vercel may fire GETs; both behaviors below are identical.

async function handle(req: Request) {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 }
    )
  }
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = process.env.INSIGHTS_OWNER_USER_ID
  if (!userId) {
    return NextResponse.json(
      { error: 'INSIGHTS_OWNER_USER_ID not configured' },
      { status: 500 }
    )
  }

  try {
    const result = await runAndStoreWeekly(userId, '/api/insights/cron')
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Cron run failed' },
      { status: 502 }
    )
  }
}

export async function GET(req: Request) {
  return handle(req)
}

export async function POST(req: Request) {
  return handle(req)
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLastWeekRange } from '@/lib/dateRange'
import { runWeeklyInsights, type Insight } from '@/lib/runWeeklyInsights'

export const maxDuration = 60

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { start, end } = getLastWeekRange()
  const weekStart = start.toISOString().slice(0, 10)
  const startIso = start.toISOString()
  const endIso = end.toISOString()

  const admin = createAdminClient()

  const [
    { data: journalEntries },
    { data: transactions },
    { data: goals },
    { data: lastWeekInsights },
  ] = await Promise.all([
    supabase
      .from('journal_entries')
      .select('text, timestamp, rating, mood_tags, language')
      .gte('timestamp', startIso)
      .lte('timestamp', endIso)
      .order('timestamp', { ascending: true }),
    supabase
      .from('transactions')
      .select('amount, category, date')
      .gte('date', weekStart)
      .lte('date', end.toISOString().slice(0, 10)),
    supabase
      .from('goals')
      .select('title, type, target, current_progress'),
    admin
      .from('insights')
      .select('insight_type, content, title, body')
      .eq('user_id', user.id)
      .order('generated_at', { ascending: false })
      .limit(20),
  ])

  let insights: Insight[]
  try {
    insights = await runWeeklyInsights({
      weekStart: start,
      weekEnd: end,
      journalEntries: journalEntries ?? [],
      transactions: (transactions ?? []) as Array<{
        amount: number
        category: string | null
        date: string
      }>,
      goals: goals ?? [],
      lastWeekInsights: lastWeekInsights ?? [],
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Claude call failed' },
      { status: 502 }
    )
  }

  if (insights.length === 0) {
    return NextResponse.json(
      { error: 'Claude returned no usable insights' },
      { status: 502 }
    )
  }

  const rows = insights.map((i) => ({
    user_id: user.id,
    insight_type: i.type,
    title: i.title,
    body: i.body,
    verse: i.verse ?? null,
    week_start: weekStart,
  }))

  const { error: insertError } = await admin.from('insights').insert(rows)
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ inserted: insights.length, week_start: weekStart })
}

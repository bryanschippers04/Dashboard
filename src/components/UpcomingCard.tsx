import Link from 'next/link'
import Card from '@/components/Card'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  addDaysIso,
  type CalendarEventLite,
  eventTimeLabel,
  formatDayShort,
  formatShortDate,
  formatTime,
  groupByDay,
  todayIso,
} from '@/lib/calendarFormat'

const TODAY_LIMIT = 4

export default async function UpcomingCard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const admin = createAdminClient()
  const tokenRes = await admin
    .from('calendar_tokens')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  const connected = !!tokenRes.data

  if (!connected) {
    return (
      <Card
        number="09"
        label="UPCOMING"
        action={
          <Link
            href="/calendar"
            className="text-[10px] text-zinc-600 hover:text-zinc-300 tracking-widest transition-colors"
          >
            OPEN →
          </Link>
        }
      >
        <div>
          <p className="text-[10px] text-zinc-600 tracking-wider mb-1">
            NOT CONNECTED
          </p>
          <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
            Link Google Calendar to see your week at a glance.
          </p>
          <Link
            href="/api/calendar/connect"
            className="block text-[10px] text-zinc-700 hover:text-accent transition-colors tracking-widest"
          >
            + CONNECT GOOGLE CALENDAR
          </Link>
        </div>
      </Card>
    )
  }

  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const cutoff = new Date(startOfToday.getTime() + 7 * 86400000)
  const today = todayIso(now)

  const { data } = await admin
    .from('calendar_events')
    .select('id, summary, start_at, end_at, all_day, location')
    .eq('user_id', user.id)
    .gte('start_at', startOfToday.toISOString())
    .lt('start_at', cutoff.toISOString())
    .order('start_at', { ascending: true })

  const events = (data ?? []) as CalendarEventLite[]
  const grouped = groupByDay(events)
  const byDay = new Map(grouped.map((g) => [g.day, g.items]))

  const todaysEvents = byDay.get(today) ?? []
  const todaysShown = todaysEvents.slice(0, TODAY_LIMIT)
  const todaysExtra = todaysEvents.length - todaysShown.length

  // Next 6 day rows, one per calendar day after today.
  const upcomingRows = Array.from({ length: 6 }, (_, i) => {
    const iso = addDaysIso(today, i + 1)
    return { iso, items: byDay.get(iso) ?? [] }
  })

  return (
    <Card
      number="09"
      label="UPCOMING"
      action={
        <Link
          href="/calendar"
          className="text-[10px] text-zinc-600 hover:text-zinc-300 tracking-widest transition-colors"
        >
          → CAL
        </Link>
      }
    >
      <div className="flex flex-col gap-4">
        {/* TODAY block */}
        <div className="border border-accent/40 bg-accent/[0.04] px-3 py-2.5">
          <p className="text-[10px] text-accent tracking-[0.2em] uppercase mb-2">
            Today · {formatShortDate(today)}
          </p>
          {todaysShown.length === 0 ? (
            <p className="text-xs text-zinc-500">Nothing scheduled.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {todaysShown.map((e) => (
                <div key={e.id} className="flex items-start gap-3">
                  <span className="w-14 shrink-0 text-[10px] text-zinc-500 tracking-wider tabular-nums pt-0.5">
                    {eventTimeLabel(e)}
                  </span>
                  <span className="text-xs text-zinc-100 truncate flex-1 min-w-0">
                    {e.summary ?? '(no title)'}
                  </span>
                </div>
              ))}
              {todaysExtra > 0 && (
                <p className="text-[10px] text-zinc-600 tracking-wider tabular-nums pl-[68px]">
                  + {todaysExtra} MORE
                </p>
              )}
            </div>
          )}
        </div>

        {/* Next 6 days */}
        <div className="flex flex-col">
          {upcomingRows.map(({ iso, items }) => (
            <UpcomingRow key={iso} iso={iso} items={items} />
          ))}
        </div>
      </div>
    </Card>
  )
}

function UpcomingRow({
  iso,
  items,
}: {
  iso: string
  items: CalendarEventLite[]
}) {
  const first = items[0]
  const extra = items.length - 1

  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-slate-800 last:border-b-0">
      <span className="w-14 shrink-0 text-[10px] text-zinc-500 tracking-widest tabular-nums">
        {formatDayShort(iso)}
      </span>
      {first ? (
        <>
          <span className="w-14 shrink-0 text-[10px] text-zinc-500 tracking-wider tabular-nums">
            {first.all_day ? 'ALL DAY' : formatTime(first.start_at)}
          </span>
          <span className="text-xs text-zinc-300 truncate flex-1 min-w-0">
            {first.summary ?? '(no title)'}
            {extra > 0 && (
              <span className="text-zinc-600 tabular-nums"> +{extra}</span>
            )}
          </span>
        </>
      ) : (
        <span className="text-xs text-zinc-700">—</span>
      )}
    </div>
  )
}

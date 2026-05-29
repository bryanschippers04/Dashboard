import Link from 'next/link'
import TopNav from '@/components/TopNav'
import CalendarSyncButton from '@/components/CalendarSyncButton'
import CalendarDisconnectButton from '@/components/CalendarDisconnectButton'
import CalendarWeekStrip from '@/components/CalendarWeekStrip'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  type CalendarEventLite,
  eventTimeLabel,
  formatDayHeader,
  formatShortDate,
  groupByDay,
  todayIso,
} from '@/lib/calendarFormat'

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const tokenRes = user
    ? await admin
        .from('calendar_tokens')
        .select('updated_at')
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null }

  const connected = !!tokenRes.data
  const lastSyncedAt =
    (tokenRes.data as { updated_at: string } | null)?.updated_at ?? null

  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const cutoff = new Date(startOfToday.getTime() + 30 * 86400000)
  const today = todayIso(now)

  const eventsRes = user
    ? await supabase
        .from('calendar_events')
        .select('id, summary, start_at, end_at, all_day, location')
        .gte('start_at', startOfToday.toISOString())
        .lte('start_at', cutoff.toISOString())
        .order('start_at', { ascending: true })
    : { data: [] as CalendarEventLite[] }

  const events = (eventsRes.data ?? []) as CalendarEventLite[]
  const grouped = groupByDay(events)
  const todaysEvents = grouped.find((g) => g.day === today)?.items ?? []
  const futureGroups = grouped.filter((g) => g.day !== today)

  // Density counts per day for the week strip.
  const counts: Record<string, number> = {}
  for (const g of grouped) counts[g.day] = g.items.length

  return (
    <div className="min-h-screen bg-[#050d1c]">
      <TopNav />
      <main className="app-page-top px-3 pb-12 md:px-5 max-w-3xl mx-auto">
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-zinc-600 tracking-widest">09 //</span>
            <span className="text-[10px] text-zinc-500 tracking-[0.2em]">
              CALENDAR
            </span>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-base text-zinc-100">Calendar</h1>
            <Link
              href="/"
              className="text-[10px] text-zinc-600 hover:text-zinc-300 tracking-wider transition-colors"
            >
              ← HOME
            </Link>
          </div>
        </div>

        {sp.connected && (
          <div className="mb-4 border border-accent/40 bg-accent/5 px-3 py-2 text-[11px] text-accent tracking-wider">
            Google Calendar connected.
          </div>
        )}
        {sp.error && (
          <div className="mb-4 border border-red-500/40 bg-red-500/5 px-3 py-2 text-[11px] text-red-400 tracking-wider">
            {decodeURIComponent(sp.error)}
          </div>
        )}

        {!connected ? (
          <div className="border border-slate-800 bg-[#0a1830] p-6">
            <p className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase mb-2">
              Not connected
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Link your Google Calendar to feed today&apos;s schedule into the
              insights pipeline. Read-only — we never modify your calendar.
            </p>
            <a
              href="/api/calendar/connect"
              className="inline-block border border-accent text-accent text-[10px] tracking-[0.2em] px-3 py-2.5 hover:bg-accent/10 active:bg-accent/10 transition-colors"
            >
              + CONNECT GOOGLE CALENDAR
            </a>
          </div>
        ) : (
          <>
            <div className="border border-slate-800 bg-[#0a1830] px-4 py-3 mb-5 flex items-center justify-between flex-wrap gap-3">
              <CalendarSyncButton lastSyncedAt={lastSyncedAt} />
              <CalendarDisconnectButton />
            </div>

            <CalendarWeekStrip todayIso={today} counts={counts} />

            <TodayBlock today={today} events={todaysEvents} now={now} />

            {futureGroups.length === 0 ? (
              <p className="text-xs text-zinc-700 py-4">
                Nothing scheduled in the next 30 days.
              </p>
            ) : (
              <div className="flex flex-col gap-6 mt-6">
                {futureGroups.map((g) => (
                  <section
                    key={g.day}
                    id={`day-${g.day}`}
                    className="scroll-mt-24"
                  >
                    <p className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase mb-2">
                      {formatDayHeader(g.day, now)}
                    </p>
                    <div className="flex flex-col">
                      {g.items.map((e) => (
                        <EventRow key={e.id} event={e} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function TodayBlock({
  today,
  events,
  now,
}: {
  today: string
  events: CalendarEventLite[]
  now: Date
}) {
  const nowMs = now.getTime()
  // Compute the index where `▸ now` slips in: first event whose start
  // is in the future (or end is in the future, for events in progress).
  let nowMarkerIdx = events.findIndex((e) => {
    if (e.all_day) return false
    const start = e.start_at ? new Date(e.start_at).getTime() : 0
    return start >= nowMs
  })
  if (nowMarkerIdx === -1) nowMarkerIdx = events.length

  // Only render the marker if today's events include both past and future
  // — otherwise it's noise.
  const hasPast = events.some((e) => {
    if (e.all_day) return false
    const end = e.end_at
      ? new Date(e.end_at).getTime()
      : e.start_at
        ? new Date(e.start_at).getTime()
        : 0
    return end < nowMs
  })
  const hasFuture = nowMarkerIdx < events.length
  const showMarker = hasPast && hasFuture

  return (
    <section
      id={`day-${today}`}
      className="scroll-mt-24 border border-accent/40 bg-accent/[0.03] p-4"
    >
      <p className="text-[10px] text-accent tracking-[0.2em] uppercase mb-3">
        Today · {formatShortDate(today)}
      </p>
      {events.length === 0 ? (
        <p className="text-xs text-zinc-500">Nothing scheduled.</p>
      ) : (
        <div className="flex flex-col">
          {events.map((e, i) => (
            <div key={e.id}>
              {showMarker && i === nowMarkerIdx && <NowMarker />}
              <EventRow event={e} accent />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function NowMarker() {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="text-[10px] text-accent tracking-widest">▸ NOW</span>
      <div className="flex-1 h-px bg-accent/40" />
    </div>
  )
}

function EventRow({
  event,
  accent = false,
}: {
  event: CalendarEventLite
  accent?: boolean
}) {
  return (
    <div
      className={`flex items-start gap-3 py-2 ${
        accent
          ? 'border-b border-accent/15 last:border-b-0'
          : 'border-b border-slate-800 last:border-b-0'
      }`}
    >
      <span className="w-14 shrink-0 text-[10px] text-zinc-500 tracking-wider tabular-nums pt-0.5">
        {eventTimeLabel(event)}
      </span>
      <div className="flex-1 min-w-0">
        <p
          className={`text-xs truncate ${
            accent ? 'text-zinc-100' : 'text-zinc-200'
          }`}
        >
          {event.summary ?? '(no title)'}
        </p>
        {event.location && (
          <p className="text-[10px] text-zinc-600 mt-0.5 truncate">
            {event.location}
          </p>
        )}
      </div>
    </div>
  )
}

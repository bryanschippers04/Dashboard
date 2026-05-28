import Link from 'next/link'
import TopNav from '@/components/TopNav'
import CalendarSyncButton from '@/components/CalendarSyncButton'
import CalendarDisconnectButton from '@/components/CalendarDisconnectButton'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface EventRow {
  id: string
  summary: string | null
  start_at: string | null
  end_at: string | null
  all_day: boolean
  location: string | null
}

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

  const eventsRes = user
    ? await supabase
        .from('calendar_events')
        .select('id, summary, start_at, end_at, all_day, location')
        .gte('start_at', startOfToday.toISOString())
        .lte('start_at', cutoff.toISOString())
        .order('start_at', { ascending: true })
    : { data: [] as EventRow[] }

  const events = (eventsRes.data ?? []) as EventRow[]
  const grouped = groupByDay(events)

  return (
    <div className="min-h-screen bg-[#050d1c]">
      <TopNav />
      <main className="app-page-top px-3 pb-12 md:px-5 max-w-3xl mx-auto">
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-zinc-600 tracking-widest">08 //</span>
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

            {grouped.length === 0 ? (
              <p className="text-xs text-zinc-700 py-4">
                No upcoming events in the next 30 days. Sync if you just added
                some.
              </p>
            ) : (
              <div className="flex flex-col gap-6">
                {grouped.map((g) => (
                  <section key={g.day}>
                    <p className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase mb-2">
                      {formatDayHeader(g.day)}
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

function EventRow({ event }: { event: EventRow }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-800 last:border-b-0">
      <span className="w-14 shrink-0 text-[10px] text-zinc-600 tracking-wider tabular-nums pt-0.5">
        {event.all_day ? 'ALL DAY' : formatTime(event.start_at)}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-zinc-200 truncate">
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

function groupByDay(events: EventRow[]) {
  const map = new Map<string, EventRow[]>()
  for (const e of events) {
    if (!e.start_at) continue
    const day = e.start_at.slice(0, 10)
    if (!map.has(day)) map.set(day, [])
    map.get(day)!.push(e)
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, items]) => ({ day, items }))
}

function formatDayHeader(day: string): string {
  const d = new Date(day + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
}

function formatTime(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

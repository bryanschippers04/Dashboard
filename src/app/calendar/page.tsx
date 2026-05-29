import Link from 'next/link'
import TopNav from '@/components/TopNav'
import CalendarSyncButton from '@/components/CalendarSyncButton'
import CalendarDisconnectButton from '@/components/CalendarDisconnectButton'
import CalendarGrid from '@/components/calendar/CalendarGrid'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { type CalendarEventLite, todayIso } from '@/lib/calendarFormat'

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

  // Widened window: 7 days back to 60 days forward, so the grid still has
  // something to show when the user clicks next/previous month. Sync only
  // covers ±7/+30 so cells beyond that just stay empty.
  const now = new Date()
  const startWindow = new Date(now)
  startWindow.setHours(0, 0, 0, 0)
  startWindow.setDate(startWindow.getDate() - 7)
  const endWindow = new Date(now.getTime() + 60 * 86400000)
  const today = todayIso(now)

  const eventsRes = user
    ? await supabase
        .from('calendar_events')
        .select(
          'id, summary, description, start_at, end_at, all_day, location'
        )
        .gte('start_at', startWindow.toISOString())
        .lte('start_at', endWindow.toISOString())
        .order('start_at', { ascending: true })
    : { data: [] as CalendarEventLite[] }

  const events = (eventsRes.data ?? []) as CalendarEventLite[]

  return (
    <div className="min-h-screen bg-[#050d1c]">
      <TopNav />
      <main className="app-page-top px-3 pb-12 md:px-5 max-w-7xl mx-auto">
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

            <CalendarGrid events={events} todayIso={today} />
          </>
        )}
      </main>
    </div>
  )
}

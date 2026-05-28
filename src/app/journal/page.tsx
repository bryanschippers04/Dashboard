import Link from 'next/link'
import TopNav from '@/components/TopNav'
import JournalForm from '@/components/JournalForm'
import JournalEntryRow, { type JournalEntry } from '@/components/JournalEntryRow'
import { createClient } from '@/lib/supabase/server'

export default async function JournalPage() {
  const supabase = await createClient()
  const { data: entries } = await supabase
    .from('journal_entries')
    .select(
      'id, text, text_compact, timestamp, rating, mood_tags, sleep_minutes, energy, productivity, exercise, time_outside, phone_time_minutes'
    )
    .order('timestamp', { ascending: false })
    .limit(30)

  return (
    <div className="min-h-screen bg-[#050d1c]">
      <TopNav />
      <main className="app-page-top px-3 pb-3 md:px-5 md:pb-5 max-w-3xl mx-auto">
        {/* Page header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-zinc-600 tracking-widest">03 //</span>
            <span className="text-[10px] text-zinc-500 tracking-[0.2em]">JOURNAL</span>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-base text-zinc-100">Voice Journal</h1>
            <Link
              href="/"
              className="text-[10px] text-zinc-600 hover:text-zinc-300 tracking-wider transition-colors"
            >
              ← HOME
            </Link>
          </div>
        </div>

        <JournalForm />

        {/* Entry list */}
        <div className="mt-8">
          <p className="text-[10px] text-zinc-600 tracking-[0.2em] uppercase mb-3">
            Recent Entries ({entries?.length ?? 0})
          </p>
          <div className="flex flex-col gap-2">
            {(entries as JournalEntry[] | null)?.map((entry) => (
              <JournalEntryRow key={entry.id} entry={entry} />
            ))}
            {(!entries || entries.length === 0) && (
              <p className="text-xs text-zinc-700 py-4">
                No entries yet. Write your first one above.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

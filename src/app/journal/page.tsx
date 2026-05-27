import Link from 'next/link'
import TopNav from '@/components/TopNav'
import JournalForm from '@/components/JournalForm'
import { createClient } from '@/lib/supabase/server'

interface JournalEntry {
  id: string
  text: string
  timestamp: string
  rating: number | null
  mood_tags: string[] | null
}

export default async function JournalPage() {
  const supabase = await createClient()
  const { data: entries } = await supabase
    .from('journal_entries')
    .select('id, text, timestamp, rating, mood_tags')
    .order('timestamp', { ascending: false })
    .limit(30)

  return (
    <div className="min-h-screen bg-[#050d1c]">
      <TopNav />
      <main className="px-3 pb-3 md:px-5 md:pb-5 max-w-3xl mx-auto" style={{ paddingTop: '3rem' }}>
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
            {entries?.map((entry) => (
              <EntryRow key={entry.id} entry={entry} />
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

function EntryRow({ entry }: { entry: JournalEntry }) {
  return (
    <div className="border border-slate-800 bg-[#0a1830] p-4 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs text-zinc-300 leading-relaxed flex-1 line-clamp-2">{entry.text}</p>
        <div className="text-right shrink-0">
          {entry.rating !== null && (
            <p className="text-xs text-accent tabular-nums">{entry.rating}/10</p>
          )}
          <p className="text-[10px] text-zinc-600 mt-0.5">
            {new Date(entry.timestamp).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: '2-digit',
            })}
          </p>
        </div>
      </div>
      {entry.mood_tags && entry.mood_tags.length > 0 && (
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {entry.mood_tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] text-zinc-600 bg-slate-800/50 px-2 py-0.5 tracking-wider"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

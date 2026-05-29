import Link from 'next/link'
import TopNav from '@/components/TopNav'
import NotesList, { type NoteRow } from '@/components/NotesList'
import { createClient } from '@/lib/supabase/server'

export default async function NotesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data } = user
    ? await supabase
        .from('notes')
        .select('id, text, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
    : { data: [] }

  const notes = (data ?? []) as NoteRow[]

  return (
    <div className="min-h-screen bg-[#050d1c]">
      <TopNav />
      <main className="app-page-top px-3 pb-3 md:px-5 md:pb-5 max-w-3xl mx-auto">
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-zinc-600 tracking-widest">05 //</span>
            <span className="text-[10px] text-zinc-500 tracking-[0.2em]">NOTES</span>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-base text-zinc-100">Notes to self</h1>
            <Link
              href="/"
              className="text-[10px] text-zinc-600 hover:text-zinc-300 tracking-wider transition-colors"
            >
              ← HOME
            </Link>
          </div>
        </div>

        <NotesList initialNotes={notes} />
      </main>
    </div>
  )
}

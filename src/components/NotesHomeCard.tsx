'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, X } from 'lucide-react'
import Card from './Card'

export interface NoteRow {
  id: string
  text: string
  created_at: string
}

export default function NotesHomeCard({ initialNotes }: { initialNotes: NoteRow[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [notes, setNotes] = useState(initialNotes)
  useEffect(() => setNotes(initialNotes), [initialNotes])

  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  function refreshSoon() {
    startTransition(() => router.refresh())
  }

  async function save() {
    const text = draft.trim()
    if (!text) {
      setAdding(false)
      return
    }
    const tempId = `tmp-${Date.now()}`
    const optimistic: NoteRow = {
      id: tempId,
      text,
      created_at: new Date().toISOString(),
    }
    setNotes((prev) => [optimistic, ...prev])
    setDraft('')
    setAdding(false)

    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) {
      setNotes((prev) => prev.filter((n) => n.id !== tempId))
      return
    }
    refreshSoon()
  }

  function remove(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    fetch(`/api/notes/${id}`, { method: 'DELETE' }).then(refreshSoon)
  }

  return (
    <Card
      number="05"
      label="NOTES"
      action={
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="text-[10px] text-zinc-600 hover:text-accent tracking-widest transition-colors flex items-center gap-1"
          aria-label={adding ? 'Cancel' : 'New note'}
        >
          {adding ? <X size={11} /> : <Plus size={11} />}
          {adding ? 'CANCEL' : 'NEW'}
        </button>
      }
    >
      <div className="flex flex-col gap-3">
        {adding && (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                save()
              } else if (e.key === 'Escape') {
                setDraft('')
                setAdding(false)
              }
            }}
            onBlur={save}
            placeholder="Quick note…"
            className="w-full bg-[#0a1830] border border-slate-700 focus:border-accent text-xs text-zinc-200 placeholder:text-zinc-600 px-2 py-1.5 outline-none transition-colors"
          />
        )}

        {notes.length === 0 && !adding ? (
          <p className="text-xs text-zinc-700">No notes yet. Press NEW to add one.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
            {notes.map((n) => (
              <li
                key={n.id}
                className="group flex items-start gap-2 border border-slate-800 bg-[#0a1830] px-2 py-1.5"
              >
                <span className="flex-1 min-w-0 text-xs text-zinc-300 break-words">
                  {n.text}
                </span>
                <button
                  type="button"
                  onClick={() => remove(n.id)}
                  className="shrink-0 text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  aria-label="Delete note"
                >
                  <Trash2 size={11} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/notes"
          className="text-[10px] text-zinc-700 hover:text-accent transition-colors tracking-widest"
        >
          OPEN NOTES →
        </Link>
      </div>
    </Card>
  )
}

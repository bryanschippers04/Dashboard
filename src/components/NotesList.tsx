'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export interface NoteRow {
  id: string
  text: string
  created_at: string
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  if (sameDay) {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  })
}

export default function NotesList({ initialNotes }: { initialNotes: NoteRow[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [notes, setNotes] = useState(initialNotes)
  useEffect(() => setNotes(initialNotes), [initialNotes])

  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function refreshSoon() {
    startTransition(() => router.refresh())
  }

  async function save() {
    const text = draft.trim()
    if (!text) return
    const tempId = `tmp-${Date.now()}`
    const optimistic: NoteRow = {
      id: tempId,
      text,
      created_at: new Date().toISOString(),
    }
    setNotes((prev) => [optimistic, ...prev])
    setDraft('')
    inputRef.current?.focus()

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
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
        className="flex items-center gap-2 border border-slate-800 bg-[#0a1830] px-3 py-2"
      >
        <input
          ref={inputRef}
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Drop a note…"
          className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="text-[10px] tracking-widest px-3 py-1 border border-slate-700 text-zinc-400 hover:border-accent hover:text-accent disabled:opacity-30 transition-colors"
        >
          + ADD
        </button>
      </form>

      {notes.length === 0 ? (
        <p className="text-xs text-zinc-700 py-2">No notes yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {notes.map((n) => (
            <li
              key={n.id}
              className="group flex items-start gap-3 border border-slate-800 bg-[#0a1830] px-3 py-2"
            >
              <span className="flex-1 min-w-0 text-sm text-zinc-200 break-words whitespace-pre-wrap">
                {n.text}
              </span>
              <span className="shrink-0 text-[10px] text-zinc-600 tabular-nums tracking-wider pt-0.5">
                {formatWhen(n.created_at)}
              </span>
              <button
                type="button"
                onClick={() => remove(n.id)}
                className="shrink-0 text-zinc-600 hover:text-red-400 transition-colors"
                aria-label="Delete note"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function TodoForm() {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated')
      setSubmitting(false)
      return
    }

    const { error: dbError } = await supabase.from('todos').insert({
      user_id: user.id,
      title: title.trim(),
      due_date: dueDate || null,
    })

    if (dbError) {
      setError(dbError.message)
      setSubmitting(false)
      return
    }

    setTitle('')
    setDueDate('')
    setSubmitting(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="border border-slate-800 bg-[#0a1830] p-3 flex flex-col sm:flex-row gap-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a todo..."
        className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none px-2 py-1.5"
        required
      />
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="bg-[#050d1c] border border-slate-800 text-xs text-zinc-400 px-2 py-1.5 focus:outline-none focus:border-slate-600"
      />
      <button
        type="submit"
        disabled={!title.trim() || submitting}
        className="flex items-center justify-center gap-1.5 bg-accent text-[#050d1c] text-[10px] tracking-widest px-4 py-1.5 font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        <Plus size={11} />
        {submitting ? 'ADDING' : 'ADD'}
      </button>
      {error && <p className="text-[11px] text-red-400 px-2 sm:basis-full">{error}</p>}
    </form>
  )
}

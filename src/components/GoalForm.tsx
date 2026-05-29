'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function GoalForm() {
  const [title, setTitle] = useState('')
  const [deadline, setDeadline] = useState('')
  const [target, setTarget] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const targetNum = Number(target)
    if (!title.trim() || !Number.isInteger(targetNum) || targetNum < 1) return
    setSubmitting(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated')
      setSubmitting(false)
      return
    }

    const { error: dbError } = await supabase.from('goals').insert({
      user_id: user.id,
      title: title.trim(),
      deadline: deadline || null,
      target: targetNum,
    })

    if (dbError) {
      setError(dbError.message)
      setSubmitting(false)
      return
    }

    setTitle('')
    setDeadline('')
    setTarget('')
    setSubmitting(false)
    router.refresh()
  }

  const canSubmit = title.trim().length > 0 && Number.isInteger(Number(target)) && Number(target) >= 1

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-slate-800 bg-[#0a1830] p-3 flex flex-col sm:flex-row gap-2"
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New goal..."
        className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none px-2 py-1.5"
        required
      />
      <input
        type="date"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
        className="bg-[#050d1c] border border-slate-800 text-xs text-zinc-300 px-2 py-1.5 focus:outline-none focus:border-slate-600 tabular-nums"
        aria-label="Deadline (optional)"
      />
      <input
        type="number"
        min={1}
        step={1}
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        placeholder="target"
        className="w-20 bg-[#050d1c] border border-slate-800 text-xs text-zinc-300 placeholder-zinc-600 px-2 py-1.5 focus:outline-none focus:border-slate-600 tabular-nums"
        required
      />
      <button
        type="submit"
        disabled={!canSubmit || submitting}
        className="flex items-center justify-center gap-1.5 bg-accent text-[#050d1c] text-[10px] tracking-widest px-4 py-1.5 font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        <Plus size={11} />
        {submitting ? 'ADDING' : 'ADD'}
      </button>
      {error && <p className="text-[11px] text-red-400 px-2 sm:basis-full">{error}</p>}
    </form>
  )
}

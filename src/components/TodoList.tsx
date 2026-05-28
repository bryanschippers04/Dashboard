'use client'

import { useState, useTransition } from 'react'
import { Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export interface Todo {
  id: string
  title: string
  completed: boolean
  due_date: string | null
}

function formatDue(dueDate: string | null): { label: string; tone: 'overdue' | 'today' | 'soon' | 'normal' } | null {
  if (!dueDate) return null
  const due = new Date(dueDate + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000)

  const label = due.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()
  if (diffDays < 0) return { label: `${label} · OVERDUE`, tone: 'overdue' }
  if (diffDays === 0) return { label: 'TODAY', tone: 'today' }
  if (diffDays <= 3) return { label, tone: 'soon' }
  return { label, tone: 'normal' }
}

export default function TodoList({ todos }: { todos: Todo[] }) {
  const router = useRouter()
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()

  function markPending(id: string, on: boolean) {
    setPendingIds((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function toggle(id: string, completed: boolean) {
    markPending(id, true)
    const supabase = createClient()
    await supabase.from('todos').update({ completed: !completed }).eq('id', id)
    startTransition(() => router.refresh())
    markPending(id, false)
  }

  async function remove(id: string) {
    markPending(id, true)
    const supabase = createClient()
    await supabase.from('todos').delete().eq('id', id)
    startTransition(() => router.refresh())
    markPending(id, false)
  }

  if (todos.length === 0) {
    return (
      <p className="text-xs text-zinc-700 py-6 text-center">
        Nothing yet. Add your first todo above.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {todos.map((todo) => {
        const due = formatDue(todo.due_date)
        const isPending = pendingIds.has(todo.id)
        const dueColor =
          due?.tone === 'overdue' ? 'text-red-400' :
          due?.tone === 'today' ? 'text-accent' :
          due?.tone === 'soon' ? 'text-amber-400' :
          'text-zinc-500'

        return (
          <li
            key={todo.id}
            className={`flex items-center gap-2 border border-slate-800 bg-[#0a1830] pl-1 pr-2 transition-opacity ${
              isPending ? 'opacity-50' : ''
            }`}
          >
            <button
              type="button"
              onClick={() => toggle(todo.id, todo.completed)}
              disabled={isPending}
              className="shrink-0 w-11 h-11 flex items-center justify-center"
              aria-label={todo.completed ? 'Mark as not done' : 'Mark as done'}
            >
              <span
                className={`w-5 h-5 border flex items-center justify-center transition-colors ${
                  todo.completed
                    ? 'bg-accent border-accent'
                    : 'border-slate-500'
                }`}
              >
                {todo.completed && <Check size={12} className="text-[#050d1c]" strokeWidth={3} />}
              </span>
            </button>

            <span
              className={`flex-1 text-sm transition-colors py-2.5 ${
                todo.completed ? 'text-zinc-600 line-through' : 'text-zinc-200'
              }`}
            >
              {todo.title}
            </span>

            {due && (
              <span className={`shrink-0 text-[10px] tracking-wider tabular-nums ${dueColor}`}>
                {due.label}
              </span>
            )}

            <button
              type="button"
              onClick={() => remove(todo.id)}
              disabled={isPending}
              className="shrink-0 w-9 h-9 flex items-center justify-center text-zinc-600 hover:text-red-400 active:text-red-400 transition-colors"
              aria-label="Delete todo"
            >
              <X size={14} />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

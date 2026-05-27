import Link from 'next/link'
import TopNav from '@/components/TopNav'
import TodoForm from '@/components/TodoForm'
import TodoList, { type Todo } from '@/components/TodoList'
import { createClient } from '@/lib/supabase/server'

export default async function TodosPage() {
  const supabase = await createClient()
  const { data: todos } = await supabase
    .from('todos')
    .select('id, title, completed, due_date')
    .order('completed', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false })

  const items = (todos ?? []) as Todo[]
  const completedCount = items.filter((t) => t.completed).length
  const pct = items.length === 0 ? 0 : Math.round((completedCount / items.length) * 100)

  return (
    <div className="min-h-screen bg-[#050d1c]">
      <TopNav />
      <main className="px-3 pb-3 md:px-5 md:pb-5 max-w-3xl mx-auto" style={{ paddingTop: '3rem' }}>
        {/* Page header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-zinc-600 tracking-widest">04 //</span>
            <span className="text-[10px] text-zinc-500 tracking-[0.2em]">TODOS</span>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-base text-zinc-100">To-Do List</h1>
            <Link
              href="/"
              className="text-[10px] text-zinc-600 hover:text-zinc-300 tracking-wider transition-colors"
            >
              ← HOME
            </Link>
          </div>
        </div>

        {/* Progress bar */}
        {items.length > 0 && (
          <div className="mb-5 border border-slate-800 bg-[#0a1830] px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase">Progress</p>
              <p className="text-[10px] text-zinc-400 tabular-nums">
                {completedCount}/{items.length} · <span className="text-accent">{pct}%</span>
              </p>
            </div>
            <div className="h-0.5 bg-slate-800 relative">
              <div
                className="absolute left-0 top-0 h-full bg-accent transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        <TodoForm />

        <div className="mt-5">
          <TodoList todos={items} />
        </div>
      </main>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import Card from './Card'

export default async function OperatorCard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const email = user?.email ?? ''
  const initial = email[0]?.toUpperCase() ?? 'B'

  return (
    <Card number="01" label="OPERATOR">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 border border-slate-700 flex items-center justify-center text-sm text-zinc-300 shrink-0">
          {initial}
        </div>
        <div>
          <p className="text-sm text-zinc-100 font-medium">Bryan</p>
          <p className="text-[10px] text-zinc-600 tracking-[0.2em] mt-0.5">FOUNDER · PERSONAL</p>
          <p className="text-[10px] text-zinc-500 mt-2">● ONLINE</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
        <div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">FOCUS</p>
          <p className="text-xs text-zinc-300 leading-relaxed">Building the OS.</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">STREAK</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl text-zinc-100">0</span>
            <span className="text-[10px] text-zinc-600">DAYS</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

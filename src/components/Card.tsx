import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface CardProps {
  number: string
  label: string
  children: ReactNode
  className?: string
  action?: ReactNode
}

export default function Card({ number, label, children, className, action }: CardProps) {
  return (
    <div className={cn('border border-slate-800 bg-[#0a1830] flex flex-col', className)}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-600 tracking-widest">{number} //</span>
          <span className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase">{label}</span>
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="flex-1 p-4">{children}</div>
    </div>
  )
}

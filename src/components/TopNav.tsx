'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Clock from './Clock'
import UsageBadge from './UsageBadge'

const navItems = [
  { href: '/', label: 'HOME' },
  { href: '/journal', label: 'JOURNAL' },
  { href: '/todos', label: 'TODOS' },
  { href: '/habits', label: 'HABITS' },
  { href: '/goals', label: 'GOALS' },
  { href: '/finance', label: 'FINANCE' },
  { href: '/insights', label: 'INSIGHTS' },
  { href: '/calendar', label: 'CALENDAR' },
]

export default function TopNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-[#050d1c] border-b border-slate-800"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="h-12 flex items-center px-3 sm:px-4 gap-4 sm:gap-6">
        <span className="text-[11px] text-zinc-400 tracking-[0.3em] font-medium whitespace-nowrap select-none">
          OS <span className="text-zinc-700">{'//'}</span> V0
        </span>

        <div className="flex items-center gap-1 sm:gap-2 flex-1 overflow-x-auto scrollbar-none -mx-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-[10px] tracking-[0.2em] whitespace-nowrap transition-colors px-2 py-3 -my-3 ${
                pathname === item.href
                  ? 'text-zinc-100'
                  : 'text-zinc-600 hover:text-zinc-300 active:text-zinc-200'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <UsageBadge />
          <Clock />
        </div>
      </div>
    </nav>
  )
}

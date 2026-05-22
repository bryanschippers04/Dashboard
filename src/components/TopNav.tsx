'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Clock from './Clock'

const navItems = [
  { href: '/', label: 'HOME' },
  { href: '/journal', label: 'JOURNAL' },
  { href: '/goals', label: 'GOALS' },
  { href: '/finance', label: 'FINANCE' },
  { href: '/health', label: 'HEALTH' },
]

export default function TopNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-10 bg-[#080808] border-b border-zinc-800 flex items-center px-4 gap-6">
      <span className="text-[11px] text-zinc-400 tracking-[0.3em] font-medium whitespace-nowrap">
        OS <span className="text-zinc-700">//</span> V0
      </span>

      <div className="flex items-center gap-5 flex-1 overflow-x-auto scrollbar-none">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`text-[10px] tracking-[0.2em] whitespace-nowrap transition-colors ${
              pathname === item.href
                ? 'text-zinc-100'
                : 'text-zinc-600 hover:text-zinc-300'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <Clock />
    </nav>
  )
}

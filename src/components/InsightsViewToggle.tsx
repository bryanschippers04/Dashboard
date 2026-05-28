'use client'

import Link from 'next/link'

export type InsightsView = 'weekly' | 'daily'

export default function InsightsViewToggle({ active }: { active: InsightsView }) {
  return (
    <div className="flex items-center gap-1 border-b border-slate-800 mb-5">
      <Tab href="/insights?view=weekly" label="WEEKLY" active={active === 'weekly'} />
      <Tab href="/insights?view=daily" label="DAILY" active={active === 'daily'} />
    </div>
  )
}

function Tab({
  href,
  label,
  active,
}: {
  href: string
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={`text-[10px] tracking-[0.2em] px-3 py-2 -mb-px border-b transition-colors ${
        active
          ? 'border-accent text-zinc-100'
          : 'border-transparent text-zinc-600 hover:text-zinc-300'
      }`}
    >
      {label}
    </Link>
  )
}

'use client'

import { useState, useEffect } from 'react'

export default function Clock() {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')

  useEffect(() => {
    // setState here syncs to an external source (system clock).
    // SSR can't render real-time without hydration mismatch.
    function update() {
      const now = new Date()
      setTime(
        now.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
      setDate(
        now
          .toLocaleDateString('en-GB', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
          })
          .toUpperCase()
      )
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="text-right hidden sm:block">
      <div className="text-xs text-zinc-200 tabular-nums leading-none">{time || '00:00:00'}</div>
      <div className="text-[10px] text-zinc-600 tracking-wider mt-0.5">{date}</div>
    </div>
  )
}

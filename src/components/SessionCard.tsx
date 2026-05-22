'use client'

import { useState, useEffect } from 'react'
import Card from './Card'

function getGreeting(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function SessionCard() {
  const [greeting, setGreeting] = useState('Good morning')
  const [dateStr, setDateStr] = useState('')
  const [capture, setCapture] = useState('')

  useEffect(() => {
    const now = new Date()
    setGreeting(getGreeting(now.getHours()))
    setDateStr(
      now
        .toLocaleDateString('en-GB', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
        .toUpperCase()
    )
  }, [])

  return (
    <Card number="02" label="SESSION">
      <div>
        <p className="text-xl text-zinc-100 leading-snug">
          {greeting},{' '}
          <em className="not-italic text-zinc-400">Bryan.</em>
        </p>
        {dateStr && (
          <p className="text-[10px] text-zinc-600 tracking-wider mt-1">{dateStr}</p>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 border border-zinc-800 bg-[#080808] px-3 py-2">
        <span className="text-[10px] text-zinc-700">⌘</span>
        <input
          type="text"
          value={capture}
          onChange={(e) => setCapture(e.target.value)}
          placeholder="Capture a thought..."
          className="flex-1 bg-transparent text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none"
        />
        {capture && (
          <button
            onClick={() => setCapture('')}
            className="text-[10px] text-zinc-600 tracking-wider hover:text-accent transition-colors"
          >
            CAPTURE
          </button>
        )}
      </div>
    </Card>
  )
}

'use client'

import { useEffect } from 'react'

// Throttles in milliseconds. Calendar is cheap (Google API basically
// unlimited). Finance hits Enable Banking under PSD2's 4-unattended-
// calls-per-24h cap, so we stay well under it.
const CALENDAR_THROTTLE_MS = 10 * 60 * 1000 // 10 min
const FINANCE_THROTTLE_MS = 24 * 60 * 60 * 1000 // 24 h

const CALENDAR_KEY = 'autosync:calendar:last'
const FINANCE_KEY = 'autosync:finance:last'

function getLast(key: string): number {
  try {
    const v = window.localStorage.getItem(key)
    if (!v) return 0
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

function setLast(key: string, value: number): void {
  try {
    window.localStorage.setItem(key, String(value))
  } catch {
    // localStorage can throw in private-mode contexts; safe to ignore.
  }
}

async function fireSync(endpoint: string, key: string): Promise<void> {
  // Record the attempt BEFORE awaiting — prevents two mounts in quick
  // succession (e.g. dev-mode StrictMode double-invoke, or rapid nav)
  // from firing twice.
  setLast(key, Date.now())
  try {
    await fetch(endpoint, { method: 'POST' })
  } catch {
    // Network errors are silent — the manual sync button is always
    // available for the user to retry.
  }
}

export default function AutoSync() {
  useEffect(() => {
    const now = Date.now()
    if (now - getLast(CALENDAR_KEY) > CALENDAR_THROTTLE_MS) {
      void fireSync('/api/calendar/sync', CALENDAR_KEY)
    }
    if (now - getLast(FINANCE_KEY) > FINANCE_THROTTLE_MS) {
      void fireSync('/api/finance/sync', FINANCE_KEY)
    }
  }, [])

  return null
}

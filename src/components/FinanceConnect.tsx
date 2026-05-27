'use client'

import { useState } from 'react'
import { Building2 } from 'lucide-react'

export default function FinanceConnect() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function connect() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/finance/connect', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError(data.error || 'Connection failed')
        setLoading(false)
        return
      }
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
      setLoading(false)
    }
  }

  return (
    <div className="border border-slate-800 bg-[#0a1830] p-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border border-slate-700 flex items-center justify-center text-zinc-400">
          <Building2 size={16} />
        </div>
        <div>
          <p className="text-sm text-zinc-200">Connect your bank</p>
          <p className="text-[11px] text-zinc-500 mt-1 max-w-sm mx-auto leading-relaxed">
            Authorize Rabobank via Enable Banking. Your credentials never touch this
            app — consent stays at the bank, valid for 180 days.
          </p>
        </div>
        <button
          type="button"
          onClick={connect}
          disabled={loading}
          className="mt-2 bg-accent text-[#050d1c] text-[10px] tracking-widest px-5 py-2 font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {loading ? 'CONNECTING…' : 'CONNECT RABOBANK'}
        </button>
        {error && (
          <p className="text-[11px] text-red-400 mt-1">{error}</p>
        )}
      </div>
    </div>
  )
}

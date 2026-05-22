'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: authError } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-[10px] text-zinc-600 tracking-[0.3em] uppercase mb-3">
            OS // V0
          </p>
          <h1 className="text-lg text-zinc-100">
            {isSignUp ? 'Create account' : 'Welcome back.'}
          </h1>
          <p className="text-xs text-zinc-600 mt-1">
            {isSignUp ? 'Set up your personal OS.' : 'Sign in to your dashboard.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-[#111] border border-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-zinc-600 w-full transition-colors"
            required
          />
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-[#111] border border-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-zinc-600 w-full transition-colors"
            required
            minLength={6}
          />

          {error && (
            <p className="text-[11px] text-red-400 tracking-wide">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 bg-accent text-[#080808] text-[11px] py-3 px-4 font-medium tracking-[0.2em] uppercase hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {loading ? '...' : isSignUp ? 'CREATE ACCOUNT' : 'ENTER'}
          </button>
        </form>

        <button
          onClick={() => { setIsSignUp(!isSignUp); setError('') }}
          className="mt-5 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors tracking-wider"
        >
          {isSignUp ? '← back to sign in' : 'no account? create one →'}
        </button>
      </div>
    </div>
  )
}

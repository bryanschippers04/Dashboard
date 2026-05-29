import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { timingSafeEqual } from 'crypto'

type ServerSupabase = Awaited<ReturnType<typeof createClient>>

export interface AuthedRequest {
  user: { id: string; email?: string | null }
  supabase: ServerSupabase
}

/**
 * Resolve the authenticated user for an API route. Returns either the
 * user + scoped supabase client, or a 401 NextResponse the caller
 * should return directly.
 *
 * Usage:
 *   const auth = await requireUser()
 *   if (auth instanceof NextResponse) return auth
 *   const { user, supabase } = auth
 */
export async function requireUser(): Promise<AuthedRequest | NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return { user: { id: user.id, email: user.email ?? null }, supabase }
}

/**
 * Constant-time compare of two strings. Returns false fast on length
 * mismatch (length itself is not a secret). Used for shared-secret
 * checks like cron bearer tokens and OAuth state cookies, where a
 * naive `===` would leak via early-exit timing.
 */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'))
  } catch {
    return false
  }
}

import { createClient } from '@/lib/supabase/server'
import { findRabobankNL, startAuthorization } from '@/lib/enableBanking'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

const STATE_COOKIE = 'eb_auth_state'
const STATE_MAX_AGE = 600 // 10 minutes

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const aspsp = await findRabobankNL()

    const origin = new URL(request.url).origin
    const redirectUrl = `${origin}/api/finance/callback`
    const state = randomUUID()

    const { url } = await startAuthorization({
      aspspName: aspsp.name,
      aspspCountry: aspsp.country,
      redirectUrl,
      state,
    })

    const res = NextResponse.json({ url })
    res.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: STATE_MAX_AGE,
    })
    return res
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

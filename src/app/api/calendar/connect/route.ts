import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { buildAuthUrl } from '@/lib/googleCalendar'

const STATE_COOKIE = 'gcal_oauth_state'
const STATE_MAX_AGE = 600 // 10 minutes

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let url: string
  let state: string
  try {
    // State binds the callback to (a) this user and (b) a nonce we
    // store in a short-lived HttpOnly cookie. The callback must match
    // BOTH the user id prefix and the cookie nonce — defeats login-
    // CSRF style account-link attacks even if an attacker can lure
    // the user through Google's consent screen.
    const nonce = randomBytes(16).toString('hex')
    state = `${user.id}.${nonce}`
    url = buildAuthUrl(state)
  } catch (e) {
    console.error('calendar connect build auth url failed:', e)
    return NextResponse.json(
      { error: 'Cannot build auth URL' },
      { status: 500 }
    )
  }

  const res = NextResponse.redirect(url)
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: STATE_MAX_AGE,
  })
  return res
}

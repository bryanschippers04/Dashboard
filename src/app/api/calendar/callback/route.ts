import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleOAuthCallback, syncCalendarEvents } from '@/lib/calendarServer'
import { safeEqual } from '@/lib/apiAuth'

export const maxDuration = 30

const STATE_COOKIE = 'gcal_oauth_state'

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errParam = searchParams.get('error')

  if (errParam) {
    return NextResponse.redirect(
      new URL(`/calendar?error=${encodeURIComponent(errParam)}`, request.url)
    )
  }

  // Pull the nonce we set at /connect time and require it to match the
  // state echoed back by Google. Without this, the user.id prefix
  // check alone could be replayed by anyone who knows the user id.
  const cookieState = request.headers
    .get('cookie')
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${STATE_COOKIE}=`))
    ?.split('=')[1]

  if (
    !code ||
    !state ||
    !state.startsWith(`${user.id}.`) ||
    !safeEqual(cookieState, state)
  ) {
    const res = NextResponse.redirect(
      new URL('/calendar?error=bad_state', request.url)
    )
    res.cookies.delete(STATE_COOKIE)
    return res
  }

  try {
    await handleOAuthCallback(user.id, code)
    // Best-effort initial sync — don't fail the redirect if it errors.
    await syncCalendarEvents(user.id).catch((e) =>
      console.error('initial calendar sync failed:', e)
    )
  } catch (e) {
    console.error('calendar oauth callback failed:', e)
    const res = NextResponse.redirect(
      new URL('/calendar?error=oauth_failed', request.url)
    )
    res.cookies.delete(STATE_COOKIE)
    return res
  }

  const res = NextResponse.redirect(
    new URL('/calendar?connected=1', request.url)
  )
  res.cookies.delete(STATE_COOKIE)
  return res
}

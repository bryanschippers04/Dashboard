import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleOAuthCallback, syncCalendarEvents } from '@/lib/calendarServer'

export const maxDuration = 30

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

  // Confirm the state matches the authenticated user — guards against
  // someone tricking another session into linking their account.
  if (!code || !state || !state.startsWith(`${user.id}.`)) {
    return NextResponse.redirect(
      new URL('/calendar?error=bad_state', request.url)
    )
  }

  try {
    await handleOAuthCallback(user.id, code)
    // Best-effort initial sync — don't fail the redirect if it errors.
    await syncCalendarEvents(user.id).catch((e) =>
      console.error('initial calendar sync failed:', e)
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'oauth_failed'
    return NextResponse.redirect(
      new URL(`/calendar?error=${encodeURIComponent(msg)}`, request.url)
    )
  }

  return NextResponse.redirect(new URL('/calendar?connected=1', request.url))
}

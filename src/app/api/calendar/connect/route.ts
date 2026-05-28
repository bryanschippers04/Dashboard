import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { buildAuthUrl } from '@/lib/googleCalendar'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let url: string
  try {
    // Encode the user_id inside the state so the callback can verify
    // who is connecting. Random suffix is for entropy / CSRF surface.
    const nonce = randomBytes(16).toString('hex')
    const state = `${user.id}.${nonce}`
    url = buildAuthUrl(state)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Cannot build auth URL' },
      { status: 500 }
    )
  }

  return NextResponse.redirect(url)
}

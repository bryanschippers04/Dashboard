import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createSession } from '@/lib/enableBanking'
import { NextResponse } from 'next/server'
import { safeEqual } from '@/lib/apiAuth'

const STATE_COOKIE = 'eb_auth_state'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const errorParam = url.searchParams.get('error')
  const origin = url.origin
  const financeUrl = (qs = '') => `${origin}/finance${qs}`

  // Bank or Enable Banking returned an error during consent.
  if (errorParam) {
    return NextResponse.redirect(
      financeUrl(`?error=${encodeURIComponent(errorParam)}`)
    )
  }

  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }
  if (!code) {
    return NextResponse.redirect(financeUrl(`?error=missing_code`))
  }

  // CSRF: cookie state must match the query state.
  const cookieState = request.headers
    .get('cookie')
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${STATE_COOKIE}=`))
    ?.split('=')[1]

  if (!safeEqual(cookieState, state)) {
    return NextResponse.redirect(financeUrl(`?error=state_mismatch`))
  }

  try {
    const session = await createSession(code)
    if (!session.accounts || session.accounts.length === 0) {
      return NextResponse.redirect(financeUrl(`?error=no_accounts`))
    }

    const admin = createAdminClient()

    const { data: item, error: itemErr } = await admin
      .from('plaid_items')
      .insert({
        user_id: user.id,
        item_id: session.session_id,
        institution_name: session.aspsp?.name ?? 'Rabobank',
        access_token: JSON.stringify({
          session_id: session.session_id,
          valid_until: session.access?.valid_until ?? null,
        }),
      })
      .select()
      .single()

    if (itemErr || !item) {
      return NextResponse.redirect(
        financeUrl(`?error=${encodeURIComponent(itemErr?.message ?? 'insert_item_failed')}`)
      )
    }

    const accountRows = session.accounts.map((a) => ({
      user_id: user.id,
      plaid_item_id: item.id,
      account_id: a.uid,
      name: a.name ?? a.product ?? null,
      iban: a.account_id?.iban ?? null,
      currency: a.currency ?? 'EUR',
    }))

    const { error: accErr } = await admin.from('bank_accounts').insert(accountRows)
    if (accErr) {
      return NextResponse.redirect(
        financeUrl(`?error=${encodeURIComponent(accErr.message)}`)
      )
    }

    const res = NextResponse.redirect(financeUrl(`?connected=1`))
    res.cookies.delete(STATE_COOKIE)
    return res
  } catch (err) {
    const message = err instanceof Error ? err.message : 'callback_failed'
    return NextResponse.redirect(
      financeUrl(`?error=${encodeURIComponent(message)}`)
    )
  }
}

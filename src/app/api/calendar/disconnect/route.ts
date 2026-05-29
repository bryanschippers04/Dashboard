import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteTokens } from '@/lib/calendarServer'

export async function DELETE() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await deleteTokens(user.id)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('calendar disconnect failed:', e)
    return NextResponse.json(
      { error: 'Disconnect failed' },
      { status: 500 }
    )
  }
}

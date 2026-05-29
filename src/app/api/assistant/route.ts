import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runAssistant } from '@/lib/assistantServer'
import type { ConversationMessage } from '@/lib/claudeClient'

export const maxDuration = 60

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as {
    messages?: ConversationMessage[]
  }
  const messages = Array.isArray(body.messages) ? body.messages : []
  if (messages.length === 0) {
    return NextResponse.json(
      { error: 'messages array required' },
      { status: 400 }
    )
  }

  try {
    const result = await runAssistant(user.id, messages)
    return NextResponse.json(result)
  } catch (e) {
    console.error('assistant run failed:', e)
    return NextResponse.json(
      { error: 'Assistant failed' },
      { status: 502 }
    )
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runAssistant } from '@/lib/assistantServer'
import type { ConversationMessage } from '@/lib/claudeClient'
import { hitRateLimit, withRateLimitHeaders } from '@/lib/rateLimit'

export const maxDuration = 60

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rate = await hitRateLimit(user.id, 'assistant')
  if (!rate.ok) return rate.response

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
    return withRateLimitHeaders(NextResponse.json(result), rate)
  } catch (e) {
    console.error('assistant run failed:', e)
    return NextResponse.json(
      { error: 'Assistant failed' },
      { status: 502 }
    )
  }
}

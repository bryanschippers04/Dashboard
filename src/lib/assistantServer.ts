// Run loop for the in-app assistant. Each invocation:
// 1. Sends the conversation + tools to Claude
// 2. If Claude returns tool_use blocks, executes them server-side
// 3. Feeds tool_result blocks back to Claude
// 4. Loops up to MAX_TURNS or until Claude returns end_turn
//
// Final result is the full updated conversation so the client can
// render the new turns.

import { createAdminClient } from '@/lib/supabase/admin'
import {
  callClaudeWithTools,
  type ContentBlock,
  type ConversationMessage,
} from '@/lib/claudeClient'
import { ASSISTANT_SYSTEM_PROMPT } from '@/lib/assistantPrompt'
import { TOOL_DEFS, findTool } from '@/lib/assistantTools'
import { modelFor, getUserModelOverrides } from '@/lib/models'
import { recordUsage } from '@/lib/usage'

const MAX_TURNS = 6

export interface RunAssistantResult {
  messages: ConversationMessage[]
  // For UI: number of API roundtrips done this call.
  iterations: number
}

export async function runAssistant(
  userId: string,
  incoming: ConversationMessage[]
): Promise<RunAssistantResult> {
  const admin = createAdminClient()
  const overrides = await getUserModelOverrides(admin, userId)
  const model = modelFor('assistant', overrides.assistant)

  const messages: ConversationMessage[] = [...incoming]

  for (let i = 0; i < MAX_TURNS; i++) {
    const { content, stop_reason, usage } = await callClaudeWithTools({
      system: ASSISTANT_SYSTEM_PROMPT,
      messages,
      tools: TOOL_DEFS,
      model,
    })

    // Record cost on every API roundtrip.
    await recordUsage(admin, userId, '/api/assistant', usage)

    // Append assistant content as a new message.
    messages.push({ role: 'assistant', content })

    if (stop_reason !== 'tool_use') {
      // end_turn, stop_sequence, max_tokens — we're done.
      return { messages, iterations: i + 1 }
    }

    // Execute every tool_use block in this assistant turn.
    const toolResults: ContentBlock[] = []
    for (const block of content) {
      if (block.type !== 'tool_use') continue
      const tool = findTool(block.name)
      if (!tool) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify({ error: `Unknown tool: ${block.name}` }),
          is_error: true,
        })
        continue
      }
      try {
        const result = await tool.execute(block.input, { userId, admin })
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        })
      } catch (e) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify({
            error: e instanceof Error ? e.message : 'Tool execution failed',
          }),
          is_error: true,
        })
      }
    }

    if (toolResults.length === 0) {
      // Stop reason was tool_use but no actual tool_use blocks — safety net.
      return { messages, iterations: i + 1 }
    }

    messages.push({ role: 'user', content: toolResults })
  }

  // Hit MAX_TURNS without terminating — return what we have and let the UI
  // show a "didn't finish" hint if it wants.
  return { messages, iterations: MAX_TURNS }
}

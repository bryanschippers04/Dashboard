// Orchestrator: takes one raw journal entry, returns 2–5 compact
// bullet strings + the Claude usage record so the caller can log cost.

import { callClaudeJSON, type ClaudeUsage } from './claudeClient'
import { JOURNAL_COMPACT_SYSTEM_PROMPT } from './journalCompactPrompt'

export interface CompactJournalResult {
  bullets: string[]
  usage: ClaudeUsage
}

export async function compactJournal(rawText: string): Promise<CompactJournalResult> {
  const { data, usage } = await callClaudeJSON<unknown>({
    system: JOURNAL_COMPACT_SYSTEM_PROMPT,
    user: rawText,
    maxTokens: 600,
  })

  if (!Array.isArray(data)) {
    throw new Error('Compact journal: expected a JSON array of bullets')
  }

  const bullets = data
    .filter((s): s is string => typeof s === 'string')
    .map((s) =>
      s
        .trim()
        // Strip any leading bullet glyph Claude may have added despite
        // the instruction.
        .replace(/^[-•*·]\s*/, '')
    )
    .filter((s) => s.length > 0)
    .slice(0, 5)

  if (bullets.length === 0) {
    throw new Error('Compact journal: no bullets returned')
  }

  return { bullets, usage }
}

// Wrapper for calling the Claude API.
// One function: callClaude({ system, user, model, maxTokens })
// Returns the text content of the response.
//
// Reads the API key from process.env.ANTHROPIC_API_KEY.
// Only call this from server-side code (API routes, cron jobs) —
// never from the browser, or your key leaks.

const DEFAULT_MODEL = 'claude-sonnet-4-6'
const DEFAULT_MAX_TOKENS = 4096
const API_URL = 'https://api.anthropic.com/v1/messages'
const API_VERSION = '2023-06-01'

export interface CallClaudeArgs {
  system: string
  user: string
  model?: string
  maxTokens?: number
}

export async function callClaude({
  system,
  user,
  model = DEFAULT_MODEL,
  maxTokens = DEFAULT_MAX_TOKENS
}: CallClaudeArgs): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }

  const body = {
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }]
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION
    },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Claude API ${res.status}: ${errText}`)
  }

  const data = (await res.json()) as { content?: Array<{ text?: string }> }
  const text = data?.content?.[0]?.text
  if (typeof text !== 'string') {
    throw new Error('Claude response had no text content')
  }
  return text
}

// Helper: call Claude and parse the response as JSON.
// Tolerates accidental code fences or stray whitespace.
export async function callClaudeJSON<T = unknown>(args: CallClaudeArgs): Promise<T> {
  const raw = await callClaude(args)
  return parseJSONLoose<T>(raw)
}

function parseJSONLoose<T>(text: string): T {
  let cleaned = text.trim()
  // Strip ```json ... ``` or ``` ... ``` fences if Claude added any.
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  }
  return JSON.parse(cleaned) as T
}

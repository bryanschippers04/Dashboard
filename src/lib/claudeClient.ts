// Wrapper for calling the Claude API.
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

export interface ClaudeUsage {
  model: string
  input_tokens: number
  output_tokens: number
}

export interface CallClaudeResult {
  text: string
  usage: ClaudeUsage
}

export async function callClaude({
  system,
  user,
  model = DEFAULT_MODEL,
  maxTokens = DEFAULT_MAX_TOKENS,
}: CallClaudeArgs): Promise<CallClaudeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }

  const body = {
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Claude API ${res.status}: ${errText}`)
  }

  const data = (await res.json()) as {
    content?: Array<{ text?: string }>
    model?: string
    usage?: { input_tokens?: number; output_tokens?: number }
  }
  const text = data?.content?.[0]?.text
  if (typeof text !== 'string') {
    throw new Error('Claude response had no text content')
  }
  const usage: ClaudeUsage = {
    model: data.model ?? model,
    input_tokens: data.usage?.input_tokens ?? 0,
    output_tokens: data.usage?.output_tokens ?? 0,
  }
  return { text, usage }
}

export interface CallClaudeJSONResult<T> {
  data: T
  usage: ClaudeUsage
}

// Helper: call Claude and parse the response as JSON.
// Tolerates accidental code fences or stray whitespace.
export async function callClaudeJSON<T = unknown>(
  args: CallClaudeArgs
): Promise<CallClaudeJSONResult<T>> {
  const { text, usage } = await callClaude(args)
  return { data: parseJSONLoose<T>(text), usage }
}

function parseJSONLoose<T>(text: string): T {
  let cleaned = text.trim()
  // Strip ```json ... ``` or ``` ... ``` fences if Claude added any.
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  }
  return JSON.parse(cleaned) as T
}

// ----- Tool use (function calling) -----

export interface ToolDefinitionForApi {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
}

export interface CallClaudeWithToolsArgs {
  system: string
  messages: ConversationMessage[]
  tools: ToolDefinitionForApi[]
  model?: string
  maxTokens?: number
}

export interface CallClaudeWithToolsResult {
  content: ContentBlock[]
  stop_reason: string
  usage: ClaudeUsage
}

export async function callClaudeWithTools({
  system,
  messages,
  tools,
  model = DEFAULT_MODEL,
  maxTokens = DEFAULT_MAX_TOKENS,
}: CallClaudeWithToolsArgs): Promise<CallClaudeWithToolsResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }

  const body = {
    model,
    max_tokens: maxTokens,
    system,
    tools,
    messages,
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Claude API ${res.status}: ${errText}`)
  }

  const data = (await res.json()) as {
    content?: ContentBlock[]
    stop_reason?: string
    model?: string
    usage?: { input_tokens?: number; output_tokens?: number }
  }
  const content = data.content ?? []
  const usage: ClaudeUsage = {
    model: data.model ?? model,
    input_tokens: data.usage?.input_tokens ?? 0,
    output_tokens: data.usage?.output_tokens ?? 0,
  }
  return {
    content,
    stop_reason: data.stop_reason ?? '',
    usage,
  }
}

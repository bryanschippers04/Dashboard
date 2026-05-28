'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Send, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'

// Mirror of the server-side ConversationMessage but kept local so the
// component doesn't import server-only modules.
type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
}

function getGreeting(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function AssistantCard({ name }: { name?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState('')
  const [greeting, setGreeting] = useState('')
  const [dateStr, setDateStr] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const now = new Date()
    setGreeting(getGreeting(now.getHours()))
    setDateStr(
      now
        .toLocaleDateString('en-GB', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
        .toUpperCase()
    )
  }, [])

  // Auto-scroll the transcript when new messages arrive.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, isBusy])

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || isBusy) return
      setError('')
      const userMsg: ChatMessage = { role: 'user', content: text.trim() }
      const next = [...messages, userMsg]
      setMessages(next)
      setInput('')
      setIsOpen(true)
      setIsBusy(true)
      try {
        const res = await fetch('/api/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: next }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Assistant call failed')
          return
        }
        setMessages(data.messages as ChatMessage[])
        // Many tools mutate server data — refresh the surrounding page.
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed')
      } finally {
        setIsBusy(false)
      }
    },
    [messages, isBusy, router]
  )

  const toggleRecording = useCallback(() => {
    if (
      !('webkitSpeechRecognition' in window) &&
      !('SpeechRecognition' in window)
    ) {
      setError('Voice input not supported. Try Chrome or Safari.')
      return
    }
    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const r = new SR()
    r.continuous = true
    r.interimResults = false
    r.lang = 'nl-NL'
    r.onresult = (event) => {
      const start =
        (event as unknown as { resultIndex?: number }).resultIndex ?? 0
      let transcript = ''
      for (let i = start; i < event.results.length; i++) {
        const res = event.results[i]
        if (res.isFinal) transcript += res[0].transcript
      }
      if (transcript) {
        setInput((prev) => (prev ? prev + ' ' + transcript.trim() : transcript.trim()))
      }
    }
    r.onerror = () => setIsRecording(false)
    r.onend = () => setIsRecording(false)
    recognitionRef.current = r
    r.start()
    setIsRecording(true)
    setIsOpen(true)
  }, [isRecording])

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    void send(input)
  }

  function reset() {
    setMessages([])
    setInput('')
    setError('')
    setIsOpen(false)
  }

  const hasConversation = messages.length > 0

  return (
    <div
      className={`border border-slate-800 bg-[#0a1830] transition-all duration-200 ${
        isOpen ? 'shadow-[0_0_0_1px_rgba(34,211,238,0.2)]' : ''
      }`}
    >
      <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={11} className="text-accent shrink-0" />
          <p className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase truncate">
            Assistant
          </p>
        </div>
        <div className="flex items-center gap-3">
          {dateStr && !isOpen && (
            <p className="text-[10px] text-zinc-600 tracking-wider hidden sm:block">
              {dateStr}
            </p>
          )}
          {(hasConversation || isOpen) && (
            <button
              type="button"
              onClick={reset}
              className="text-[10px] tracking-widest text-zinc-600 hover:text-red-400 active:text-red-400 transition-colors px-2 py-1.5"
            >
              CLEAR
            </button>
          )}
        </div>
      </div>

      {!isOpen && greeting && (
        <div className="px-4 py-3 border-b border-slate-800">
          <p className="text-lg text-zinc-100 leading-snug">
            {greeting},{' '}
            <em className="not-italic text-zinc-400">
              {name ?? 'Bryan'}.
            </em>
          </p>
          {dateStr && (
            <p className="text-[10px] text-zinc-600 tracking-wider mt-1 sm:hidden">
              {dateStr}
            </p>
          )}
        </div>
      )}

      {isOpen && (
        <div
          ref={scrollRef}
          className="overflow-y-auto px-3 py-3 flex flex-col gap-3"
          style={{ height: 'min(60vh, 480px)' }}
        >
          {messages.length === 0 ? (
            <p className="text-xs text-zinc-700 leading-relaxed">
              Ask me to add todos, log a journal entry, check your spending,
              show today&apos;s calendar, recall your starred insights, or
              update a goal&apos;s progress. I&apos;ll match your language —
              Dutch or English.
            </p>
          ) : (
            messages.map((m, i) => <MessageBlock key={i} msg={m} />)
          )}
          {isBusy && (
            <div className="flex items-center gap-2 text-[10px] text-zinc-600 tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              THINKING…
            </div>
          )}
          {error && (
            <p className="text-[11px] text-red-400 leading-relaxed">
              {error}
            </p>
          )}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 px-3 py-2 border-t border-slate-800"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={
            isRecording ? 'Listening…' : 'Ask, log, or tell me what to do…'
          }
          className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none py-2"
        />
        <button
          type="button"
          onClick={toggleRecording}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          className={`w-10 h-10 flex items-center justify-center border transition-colors ${
            isRecording
              ? 'border-accent text-accent bg-accent/10'
              : 'border-slate-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 active:border-zinc-500'
          }`}
        >
          {isRecording ? <MicOff size={12} /> : <Mic size={12} />}
        </button>
        <button
          type="submit"
          disabled={!input.trim() || isBusy}
          aria-label="Send"
          className="w-10 h-10 flex items-center justify-center bg-accent text-[#050d1c] hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          <Send size={12} />
        </button>
      </form>
    </div>
  )
}

function MessageBlock({ msg }: { msg: ChatMessage }) {
  // user message can be string OR array of tool_result blocks (from the
  // server's response).
  if (msg.role === 'user') {
    if (typeof msg.content === 'string') {
      return (
        <div className="flex justify-end">
          <p className="text-xs text-zinc-200 leading-relaxed bg-slate-800/60 border border-slate-800 px-3 py-2 max-w-[85%]">
            {msg.content}
          </p>
        </div>
      )
    }
    // Tool results — render compactly so the convo stays readable.
    const results = msg.content.filter(
      (b): b is Extract<ContentBlock, { type: 'tool_result' }> =>
        b.type === 'tool_result'
    )
    if (results.length === 0) return null
    return (
      <div className="flex flex-col gap-1">
        {results.map((r, i) => (
          <ToolResultRow key={i} result={r} />
        ))}
      </div>
    )
  }

  // assistant
  if (typeof msg.content === 'string') {
    return (
      <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
        {msg.content}
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      {msg.content.map((block, i) => {
        if (block.type === 'text') {
          return (
            <p
              key={i}
              className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap"
            >
              {block.text}
            </p>
          )
        }
        if (block.type === 'tool_use') {
          return (
            <p
              key={i}
              className="text-[10px] text-zinc-600 tracking-wider"
            >
              → {block.name}
            </p>
          )
        }
        return null
      })}
    </div>
  )
}

function ToolResultRow({
  result,
}: {
  result: Extract<ContentBlock, { type: 'tool_result' }>
}) {
  return (
    <p
      className={`text-[10px] tracking-wider ${
        result.is_error ? 'text-red-400' : 'text-zinc-700'
      }`}
    >
      ✓ {result.is_error ? 'error' : 'done'}
    </p>
  )
}

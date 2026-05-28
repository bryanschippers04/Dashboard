'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, MicOff, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const DRAFT_DEBOUNCE_MS = 1500

const MOOD_TAGS = [
  'focused', 'energized', 'tired', 'anxious', 'creative',
  'calm', 'motivated', 'stressed', 'grateful', 'productive',
]

function appendSpoken(prev: string, addition: string): string {
  const clean = addition.trim()
  if (!clean) return prev
  if (!prev) return clean
  const needsSpace = !/\s$/.test(prev)
  return prev + (needsSpace ? ' ' : '') + clean
}

function snapshot(text: string, rating: number | null, tags: string[]): string {
  return JSON.stringify({ text, rating, tags: [...tags].sort() })
}

export default function JournalForm() {
  const [text, setText] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  // Last-saved snapshot — avoids re-upserting identical values.
  const lastSavedRef = useRef<string>('')
  const router = useRouter()

  // Load any existing draft on mount.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        if (!cancelled) setDraftLoaded(true)
        return
      }
      const { data } = await supabase
        .from('journal_drafts')
        .select('text, rating, mood_tags, updated_at')
        .eq('user_id', user.id)
        .maybeSingle()
      if (cancelled) return
      if (data) {
        setText(data.text ?? '')
        setRating(data.rating ?? null)
        setSelectedTags(data.mood_tags ?? [])
        setDraftSavedAt(data.updated_at ? new Date(data.updated_at) : null)
        lastSavedRef.current = snapshot(
          data.text ?? '',
          data.rating ?? null,
          data.mood_tags ?? []
        )
      }
      setDraftLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Debounced auto-save. Watches text/rating/tags. Skips while submitting
  // and while the initial draft load is still in flight.
  useEffect(() => {
    if (!draftLoaded || isSubmitting) return
    const snap = snapshot(text, rating, selectedTags)
    if (snap === lastSavedRef.current) return
    const id = setTimeout(() => {
      void saveDraft(snap)
    }, DRAFT_DEBOUNCE_MS)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, rating, selectedTags, draftLoaded, isSubmitting])

  // Flush pending draft when the tab is being hidden / closed.
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState !== 'hidden') return
      const snap = snapshot(text, rating, selectedTags)
      if (snap === lastSavedRef.current) return
      void saveDraft(snap)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, rating, selectedTags])

  async function saveDraft(snap: string) {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { error: e } = await supabase.from('journal_drafts').upsert({
      user_id: user.id,
      text,
      rating,
      mood_tags: selectedTags.length > 0 ? selectedTags : null,
      updated_at: new Date().toISOString(),
    })
    if (!e) {
      lastSavedRef.current = snap
      setDraftSavedAt(new Date())
    }
  }

  async function discardDraft() {
    if (!confirm('Discard the saved draft?')) return
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('journal_drafts').delete().eq('user_id', user.id)
    }
    setText('')
    setRating(null)
    setSelectedTags([])
    setDraftSavedAt(null)
    lastSavedRef.current = ''
  }

  const hasDraft = draftSavedAt !== null && (text.trim() || rating !== null || selectedTags.length > 0)

  const toggleRecording = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Voice input not supported in this browser. Try Chrome.')
      return
    }

    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      return
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'nl-NL'

    recognition.onresult = (event) => {
      // event.results is cumulative — start at resultIndex so we don't
      // re-append earlier finals every time a new utterance settles.
      // (resultIndex is in the Web Speech spec but missing from some
      // TS lib versions; cast through unknown.)
      const start = (event as unknown as { resultIndex?: number }).resultIndex ?? 0
      let transcript = ''
      for (let i = start; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) transcript += r[0].transcript
      }
      if (transcript) setText((prev) => appendSpoken(prev, transcript))
    }

    recognition.onerror = () => setIsRecording(false)
    recognition.onend = () => setIsRecording(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }, [isRecording])

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setIsSubmitting(true)
    setError('')

    // Server route handles Claude-compacting + insert + usage logging.
    const res = await fetch('/api/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text.trim(),
        rating,
        mood_tags: selectedTags.length > 0 ? selectedTags : null,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Save failed')
      setIsSubmitting(false)
      return
    }

    // Entry saved → clear the draft row (best-effort).
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('journal_drafts').delete().eq('user_id', user.id)
    }

    setText('')
    setRating(null)
    setSelectedTags([])
    setDraftSavedAt(null)
    lastSavedRef.current = ''
    setIsSubmitting(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="border border-slate-800 bg-[#0a1830]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800">
        <div className="flex items-baseline gap-3">
          <p className="text-[10px] text-zinc-600 tracking-[0.2em] uppercase">New Entry</p>
          {draftSavedAt && (
            <p className="text-[10px] text-zinc-700 tracking-wider">
              DRAFT · saved{' '}
              {draftSavedAt.toLocaleTimeString('nl-NL', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasDraft && (
            <button
              type="button"
              onClick={discardDraft}
              className="text-[10px] tracking-widest text-zinc-600 hover:text-red-400 transition-colors px-2 py-1.5"
            >
              DISCARD
            </button>
          )}
          <button
            type="button"
            onClick={toggleRecording}
            className={`flex items-center gap-1.5 text-[10px] tracking-widest px-3 py-1.5 border transition-colors ${
              isRecording
                ? 'border-accent text-accent bg-accent/10'
                : 'border-slate-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
            }`}
          >
            {isRecording ? <MicOff size={10} /> : <Mic size={10} />}
            {isRecording ? 'STOP' : 'VOICE'}
          </button>
        </div>
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div className="px-4 py-2 border-b border-slate-800 bg-accent/5 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <p className="text-[10px] text-accent tracking-wider">RECORDING — speak now</p>
        </div>
      )}

      {/* Text area */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What's on your mind today..."
        rows={6}
        className="w-full bg-transparent px-4 py-4 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none resize-none leading-relaxed"
      />

      <div className="px-4 pb-4 space-y-4 border-t border-slate-800 pt-4">
        {/* Rating */}
        <div>
          <p className="text-[10px] text-zinc-600 tracking-widest mb-2 uppercase">Mood Rating</p>
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: 11 }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(rating === i ? null : i)}
                className={`w-7 h-7 text-[10px] border transition-colors ${
                  rating === i
                    ? 'border-accent text-accent bg-accent/10'
                    : 'border-slate-800 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400'
                }`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        {/* Mood tags */}
        <div>
          <p className="text-[10px] text-zinc-600 tracking-widest mb-2 uppercase">Mood Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {MOOD_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`text-[10px] px-2.5 py-1 border transition-colors tracking-wider ${
                  selectedTags.includes(tag)
                    ? 'border-accent text-accent bg-accent/10'
                    : 'border-slate-800 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-[11px] text-red-400">{error}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!text.trim() || isSubmitting}
            className="flex items-center gap-2 text-[10px] tracking-widest bg-accent text-[#050d1c] px-4 py-2.5 font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Send size={10} />
            {isSubmitting ? 'SAVING...' : 'SAVE ENTRY'}
          </button>
        </div>
      </div>
    </form>
  )
}

'use client'

import { useState, useRef, useCallback } from 'react'
import { Mic, MicOff, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const MOOD_TAGS = [
  'focused', 'energized', 'tired', 'anxious', 'creative',
  'calm', 'motivated', 'stressed', 'grateful', 'productive',
]

export default function JournalForm() {
  const [text, setText] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const router = useRouter()

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
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript + ' '
        }
      }
      if (transcript) setText((prev) => prev + transcript)
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

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('Not authenticated')
      setIsSubmitting(false)
      return
    }

    const { error: dbError } = await supabase.from('journal_entries').insert({
      user_id: user.id,
      text: text.trim(),
      rating,
      mood_tags: selectedTags.length > 0 ? selectedTags : null,
      timestamp: new Date().toISOString(),
    })

    if (dbError) {
      setError(dbError.message)
      setIsSubmitting(false)
      return
    }

    setText('')
    setRating(null)
    setSelectedTags([])
    setIsSubmitting(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="border border-zinc-800 bg-[#111]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800">
        <p className="text-[10px] text-zinc-600 tracking-[0.2em] uppercase">New Entry</p>
        <button
          type="button"
          onClick={toggleRecording}
          className={`flex items-center gap-1.5 text-[10px] tracking-widest px-3 py-1.5 border transition-colors ${
            isRecording
              ? 'border-accent text-accent bg-accent/10'
              : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
          }`}
        >
          {isRecording ? <MicOff size={10} /> : <Mic size={10} />}
          {isRecording ? 'STOP' : 'VOICE'}
        </button>
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div className="px-4 py-2 border-b border-zinc-800 bg-accent/5 flex items-center gap-2">
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

      <div className="px-4 pb-4 space-y-4 border-t border-zinc-800 pt-4">
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
                    : 'border-zinc-800 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400'
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
                    : 'border-zinc-800 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400'
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
            className="flex items-center gap-2 text-[10px] tracking-widest bg-accent text-[#080808] px-4 py-2.5 font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Send size={10} />
            {isSubmitting ? 'SAVING...' : 'SAVE ENTRY'}
          </button>
        </div>
      </div>
    </form>
  )
}

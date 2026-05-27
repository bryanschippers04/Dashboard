// The 13 mood tags shown on the journal screen.
// See: docs/superpowers/specs/2026-05-23-mood-tags-vocabulary.md

export interface MoodTag {
  slug: string
  label: string
  emoji: string
}

export const FEELING_TAGS: MoodTag[] = [
  { slug: 'energized',  label: 'Energized',  emoji: '⚡' },
  { slug: 'tired',      label: 'Tired',      emoji: '😴' },
  { slug: 'calm',       label: 'Calm',       emoji: '🌊' },
  { slug: 'anxious',    label: 'Anxious',    emoji: '😬' },
  { slug: 'down',       label: 'Down',       emoji: '⬇️' },
  { slug: 'happy',      label: 'Happy',      emoji: '😊' },
  { slug: 'frustrated', label: 'Frustrated', emoji: '😤' },
  { slug: 'grateful',   label: 'Grateful',   emoji: '🙏' },
  { slug: 'brain_fog',  label: 'Brain fog',  emoji: '🌫️' }
]

export const CONTEXT_TAGS: MoodTag[] = [
  { slug: 'focused',   label: 'Focused',   emoji: '🎯' },
  { slug: 'scattered', label: 'Scattered', emoji: '🪟' },
  { slug: 'connected', label: 'Connected', emoji: '🤝' },
  { slug: 'alone',     label: 'Alone',     emoji: '🚶' }
]

export const ALL_TAGS: MoodTag[] = [...FEELING_TAGS, ...CONTEXT_TAGS]

const TAG_BY_SLUG: Record<string, MoodTag> = Object.fromEntries(
  ALL_TAGS.map(t => [t.slug, t])
)

export function getTag(slug: string): MoodTag | null {
  return TAG_BY_SLUG[slug] ?? null
}

export function isValidTag(slug: string): boolean {
  return Boolean(TAG_BY_SLUG[slug])
}

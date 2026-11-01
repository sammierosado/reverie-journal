import type { JSONContent } from '@tiptap/core'
import type { AestheticId } from '../themes/aesthetics'

/** Version of the stored record shape. Bumped together with a Dexie migration. */
export const DATA_VERSION = 2

export type MoodId =
  | 'radiant'
  | 'serene'
  | 'tender'
  | 'wistful'
  | 'melancholy'
  | 'restless'
  | 'weary'
  | 'fierce'

export interface Mood {
  id: MoodId
  label: string
  /** A single typographic glyph, rendered in the margin. */
  glyph: string
}

export interface Reminder {
  id: string
  text: string
  done: boolean
}

export interface JournalEntry {
  id: string
  title: string
  /** Tiptap document JSON. Paragraphs and headings carry a stable `pid` attribute. */
  content: JSONContent
  /** Derived from `content` on every save; used for search and excerpts. */
  plainText: string
  /** Local calendar day, `YYYY-MM-DD`. Several entries may share a day. */
  entryDate: string
  createdAt: number
  updatedAt: number
  mood: MoodId | null
  tags: string[]
  favorite: boolean
  /** A writing prompt the writer chose to keep beside this entry. */
  prompt: string | null
  reminders: Reminder[]
  dataVersion: number
}

/**
 * A paragraph as seen by the rest of the app. Not stored separately:
 * it is derived from `JournalEntry.content`, where the `pid` lives on the node itself.
 */
export interface JournalParagraph {
  id: string
  type: 'paragraph' | 'heading'
  text: string
}

export type MarginSide = 'left' | 'right'
export type AnnotationKind = 'note' | 'reflection' | 'quote' | 'question'

export interface MarginAnnotation {
  id: string
  entryId: string
  /** The `pid` of the paragraph this note is anchored to. */
  paragraphId: string
  side: MarginSide
  kind: AnnotationKind
  text: string
  createdAt: number
  updatedAt: number
}

export interface Tag {
  name: string
  createdAt: number
}

export type ThemePreference = 'light' | 'dark' | 'system'

export interface UserPreferences {
  id: 'prefs'
  theme: ThemePreference
  /** Visual style; see src/themes/aesthetics.ts. Unknown ids fall back to the default. */
  aesthetic: AestheticId
  /** Body text size in px. */
  fontSize: number
  /** Unitless line height. */
  lineHeight: number
  typewriterMode: boolean
  showMargins: boolean
  lastEntryId: string | null
  lastBackupAt: number | null
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  id: 'prefs',
  theme: 'system',
  aesthetic: 'fallen-angel',
  fontSize: 20,
  lineHeight: 1.75,
  typewriterMode: false,
  showMargins: true,
  lastEntryId: null,
  lastBackupAt: null,
}

export const MOODS: readonly Mood[] = [
  { id: 'radiant', label: 'Radiant', glyph: '☀' },
  { id: 'serene', label: 'Serene', glyph: '☾' },
  { id: 'tender', label: 'Tender', glyph: '♡' },
  { id: 'wistful', label: 'Wistful', glyph: '❦' },
  { id: 'melancholy', label: 'Melancholy', glyph: '☂' },
  { id: 'restless', label: 'Restless', glyph: '∿' },
  { id: 'weary', label: 'Weary', glyph: '◌' },
  { id: 'fierce', label: 'Fierce', glyph: '✦' },
]

export const ANNOTATION_KINDS: readonly { id: AnnotationKind; label: string }[] = [
  { id: 'note', label: 'Note' },
  { id: 'reflection', label: 'Reflection' },
  { id: 'quote', label: 'Quote' },
  { id: 'question', label: 'Question' },
]

export function moodById(id: MoodId | null): Mood | undefined {
  return MOODS.find((m) => m.id === id)
}

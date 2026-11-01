import type { JSONContent } from '@tiptap/core'
import { db } from './database'
import {
  DATA_VERSION,
  DEFAULT_PREFERENCES,
  type JournalEntry,
  type MarginAnnotation,
  type MarginSide,
  type AnnotationKind,
  type UserPreferences,
} from './types'
import { newId } from '../lib/ids'
import { toDayKey } from '../lib/dates'
import { docToPlainText, emptyDoc } from '../editor/content'

/* ---------- entries ---------- */

export function makeEntry(entryDate = toDayKey()): JournalEntry {
  const now = Date.now()
  return {
    id: newId(),
    title: '',
    content: emptyDoc(),
    plainText: '',
    entryDate,
    createdAt: now,
    updatedAt: now,
    mood: null,
    tags: [],
    favorite: false,
    prompt: null,
    reminders: [],
    dataVersion: DATA_VERSION,
  }
}

export async function listEntries(): Promise<JournalEntry[]> {
  return db.entries.orderBy('updatedAt').reverse().toArray()
}

export async function getEntry(id: string): Promise<JournalEntry | undefined> {
  return db.entries.get(id)
}

export type EntryPatch = Partial<Omit<JournalEntry, 'id' | 'createdAt' | 'dataVersion'>>

/** Normalizes derived fields so stored records are always internally consistent. */
export function applyEntryPatch(entry: JournalEntry, patch: EntryPatch, now = Date.now()): JournalEntry {
  const next: JournalEntry = { ...entry, ...patch, updatedAt: patch.updatedAt ?? now }
  if (patch.content) next.plainText = docToPlainText(patch.content as JSONContent)
  if (patch.tags) next.tags = normalizeTags(patch.tags)
  return next
}

/** Inserts or replaces a whole entry and records its tags. */
export async function saveEntry(entry: JournalEntry): Promise<void> {
  await db.transaction('rw', db.entries, db.tags, async () => {
    await db.entries.put(entry)
    await recordTags(entry.tags)
  })
}

export async function deleteEntry(id: string): Promise<void> {
  await db.transaction('rw', db.entries, db.annotations, async () => {
    await db.annotations.where('entryId').equals(id).delete()
    await db.entries.delete(id)
  })
}

/* ---------- tags ---------- */

export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>()
  for (const raw of tags) {
    const tag = raw.trim().replace(/^#/, '').replace(/\s+/g, '-').toLowerCase()
    if (tag && tag.length <= 40) seen.add(tag)
  }
  return [...seen]
}

async function recordTags(tags: string[]): Promise<void> {
  if (tags.length === 0) return
  const existing = new Set((await db.tags.bulkGet(tags)).filter(Boolean).map((t) => t!.name))
  const now = Date.now()
  const fresh = tags.filter((t) => !existing.has(t)).map((name) => ({ name, createdAt: now }))
  if (fresh.length) await db.tags.bulkPut(fresh)
}

export async function listTags(): Promise<string[]> {
  return (await db.tags.toArray()).map((t) => t.name).sort()
}

/* ---------- annotations ---------- */

export function makeAnnotation(
  entryId: string,
  paragraphId: string,
  side: MarginSide,
  kind: AnnotationKind = 'note',
): MarginAnnotation {
  const now = Date.now()
  return { id: newId(), entryId, paragraphId, side, kind, text: '', createdAt: now, updatedAt: now }
}

export async function listAnnotations(entryId: string): Promise<MarginAnnotation[]> {
  const rows = await db.annotations.where('entryId').equals(entryId).toArray()
  return rows.sort((a, b) => a.createdAt - b.createdAt)
}

export async function listAllAnnotations(): Promise<MarginAnnotation[]> {
  return db.annotations.toArray()
}

export async function saveAnnotation(annotation: MarginAnnotation): Promise<void> {
  await db.annotations.put(annotation)
}

export async function deleteAnnotation(id: string): Promise<void> {
  await db.annotations.delete(id)
}

/* ---------- preferences ---------- */

export async function loadPreferences(): Promise<UserPreferences> {
  const stored = await db.preferences.get('prefs')
  return { ...DEFAULT_PREFERENCES, ...stored, id: 'prefs' }
}

export async function savePreferences(prefs: UserPreferences): Promise<void> {
  await db.preferences.put(prefs)
}

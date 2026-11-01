import { db } from './database'
import {
  ANNOTATION_KINDS,
  DATA_VERSION,
  DEFAULT_PREFERENCES,
  MOODS,
  type JournalEntry,
  type MarginAnnotation,
  type Tag,
  type UserPreferences,
} from './types'
import { isDayKey } from '../lib/dates'
import { docToPlainText } from '../editor/content'

export const BACKUP_APP_ID = 'reverie-journal'
export const BACKUP_FORMAT_VERSION = 1

export interface JournalBackup {
  app: typeof BACKUP_APP_ID
  formatVersion: number
  dataVersion: number
  exportedAt: string
  entries: JournalEntry[]
  annotations: MarginAnnotation[]
  tags: Tag[]
  preferences: UserPreferences | null
}

export async function createBackup(): Promise<JournalBackup> {
  return db.transaction('r', [db.entries, db.annotations, db.tags, db.preferences], async () => ({
    app: BACKUP_APP_ID,
    formatVersion: BACKUP_FORMAT_VERSION,
    dataVersion: DATA_VERSION,
    exportedAt: new Date().toISOString(),
    entries: await db.entries.toArray(),
    annotations: await db.annotations.toArray(),
    tags: await db.tags.toArray(),
    preferences: (await db.preferences.get('prefs')) ?? null,
  }))
}

/* ---------- validation ---------- */

export class BackupValidationError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string'
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const moodIds = new Set<string>(MOODS.map((m) => m.id))
const kindIds = new Set<string>(ANNOTATION_KINDS.map((k) => k.id))

function fail(message: string): never {
  throw new BackupValidationError(message)
}

function validateEntry(raw: unknown, i: number): JournalEntry {
  const where = `Entry ${i + 1}`
  if (!isObj(raw)) fail(`${where} is not an object.`)
  if (!isStr(raw.id) || !raw.id) fail(`${where} has no id.`)
  if (!isObj(raw.content) || raw.content.type !== 'doc') fail(`${where} has invalid content.`)
  if (!isDayKey(raw.entryDate)) fail(`${where} has an invalid date.`)
  if (!isNum(raw.createdAt) || !isNum(raw.updatedAt)) fail(`${where} has invalid timestamps.`)
  const content = raw.content as JournalEntry['content']
  const reminders = Array.isArray(raw.reminders) ? raw.reminders : []
  return {
    id: raw.id,
    title: isStr(raw.title) ? raw.title : '',
    content,
    plainText: docToPlainText(content),
    entryDate: raw.entryDate,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    mood: isStr(raw.mood) && moodIds.has(raw.mood) ? (raw.mood as JournalEntry['mood']) : null,
    tags: Array.isArray(raw.tags) ? raw.tags.filter(isStr) : [],
    favorite: raw.favorite === true,
    prompt: isStr(raw.prompt) ? raw.prompt : null,
    reminders: reminders
      .filter(isObj)
      .filter((r) => isStr(r.id) && isStr(r.text))
      .map((r) => ({ id: r.id as string, text: r.text as string, done: r.done === true })),
    dataVersion: DATA_VERSION,
  }
}

function validateAnnotation(raw: unknown, i: number, entryIds: Set<string>): MarginAnnotation {
  const where = `Margin note ${i + 1}`
  if (!isObj(raw)) fail(`${where} is not an object.`)
  if (!isStr(raw.id) || !isStr(raw.entryId) || !isStr(raw.paragraphId)) fail(`${where} is missing ids.`)
  if (!entryIds.has(raw.entryId)) fail(`${where} belongs to an entry that is not in the backup.`)
  if (raw.side !== 'left' && raw.side !== 'right') fail(`${where} has an invalid side.`)
  if (!isStr(raw.text)) fail(`${where} has no text.`)
  if (!isNum(raw.createdAt) || !isNum(raw.updatedAt)) fail(`${where} has invalid timestamps.`)
  return {
    id: raw.id,
    entryId: raw.entryId,
    paragraphId: raw.paragraphId,
    side: raw.side,
    kind: isStr(raw.kind) && kindIds.has(raw.kind) ? (raw.kind as MarginAnnotation['kind']) : 'note',
    text: raw.text,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}

/** Parses and validates a backup file. Throws `BackupValidationError` with a readable message. */
export function parseBackup(json: string): JournalBackup {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    fail('This file is not valid JSON.')
  }
  if (!isObj(data) || data.app !== BACKUP_APP_ID) fail('This file is not a Reverie Journal backup.')
  if (!isNum(data.formatVersion) || data.formatVersion > BACKUP_FORMAT_VERSION)
    fail('This backup was made by a newer version of Reverie Journal.')
  if (!Array.isArray(data.entries) || !Array.isArray(data.annotations)) fail('The backup is missing its entries.')

  const entries = data.entries.map(validateEntry)
  const entryIds = new Set(entries.map((e) => e.id))
  if (entryIds.size !== entries.length) fail('The backup contains duplicate entries.')
  const annotations = data.annotations.map((a, i) => validateAnnotation(a, i, entryIds))
  const tags: Tag[] = Array.isArray(data.tags)
    ? data.tags.filter(isObj).filter((t) => isStr(t.name)).map((t) => ({
        name: t.name as string,
        createdAt: isNum(t.createdAt) ? t.createdAt : Date.now(),
      }))
    : []
  const preferences = isObj(data.preferences)
    ? ({ ...DEFAULT_PREFERENCES, ...data.preferences, id: 'prefs' } as UserPreferences)
    : null

  return {
    app: BACKUP_APP_ID,
    formatVersion: data.formatVersion,
    dataVersion: isNum(data.dataVersion) ? data.dataVersion : DATA_VERSION,
    exportedAt: isStr(data.exportedAt) ? data.exportedAt : '',
    entries,
    annotations,
    tags,
    preferences,
  }
}

/* ---------- restore ---------- */

export type RestoreMode = 'replace' | 'merge'

export interface RestoreResult {
  entries: number
  annotations: number
}

/**
 * `replace` wipes the journal and loads the backup.
 * `merge` keeps existing data; when the same entry exists in both, the most recently updated copy wins.
 * Runs in a single transaction, so a failure leaves the journal untouched.
 */
export async function restoreBackup(backup: JournalBackup, mode: RestoreMode): Promise<RestoreResult> {
  return db.transaction('rw', [db.entries, db.annotations, db.tags, db.preferences], async () => {
    if (mode === 'replace') {
      await Promise.all([db.entries.clear(), db.annotations.clear(), db.tags.clear()])
      await db.entries.bulkPut(backup.entries)
      await db.annotations.bulkPut(backup.annotations)
      await db.tags.bulkPut(backup.tags)
      if (backup.preferences) await db.preferences.put({ ...backup.preferences, lastEntryId: null })
      return { entries: backup.entries.length, annotations: backup.annotations.length }
    }

    const existing = new Map((await db.entries.bulkGet(backup.entries.map((e) => e.id))).flatMap((e) => (e ? [[e.id, e]] : [])))
    const newerEntries = backup.entries.filter((e) => (existing.get(e.id)?.updatedAt ?? -1) < e.updatedAt)
    await db.entries.bulkPut(newerEntries)

    const existingNotes = new Map(
      (await db.annotations.bulkGet(backup.annotations.map((a) => a.id))).flatMap((a) => (a ? [[a.id, a]] : [])),
    )
    const newerNotes = backup.annotations.filter((a) => (existingNotes.get(a.id)?.updatedAt ?? -1) < a.updatedAt)
    await db.annotations.bulkPut(newerNotes)
    await db.tags.bulkPut(backup.tags)
    return { entries: newerEntries.length, annotations: newerNotes.length }
  })
}

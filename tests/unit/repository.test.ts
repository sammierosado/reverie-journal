import { beforeEach, describe, expect, it } from 'vitest'
import { freshDatabase, doc } from '../helpers'
import {
  applyEntryPatch,
  deleteEntry,
  getEntry,
  listAnnotations,
  listEntries,
  listTags,
  loadPreferences,
  makeAnnotation,
  makeEntry,
  normalizeTags,
  saveAnnotation,
  saveEntry,
  savePreferences,
} from '../../src/db/repository'
import { DEFAULT_PREFERENCES } from '../../src/db/types'

beforeEach(() => {
  freshDatabase()
})

describe('entries', () => {
  it('saves and reloads an entry with its content and metadata', async () => {
    const entry = applyEntryPatch(makeEntry('2026-11-01'), {
      title: 'Moonlit',
      content: doc({ text: 'Hello stars', pid: 'p1' }),
      mood: 'serene',
      tags: ['Night ', '#night', 'reading list'],
      favorite: true,
    })
    await saveEntry(entry)

    const loaded = await getEntry(entry.id)
    expect(loaded?.title).toBe('Moonlit')
    expect(loaded?.plainText).toBe('Hello stars')
    expect(loaded?.tags).toEqual(['night', 'reading-list'])
    expect(loaded?.favorite).toBe(true)
    expect(loaded?.entryDate).toBe('2026-11-01')
    expect(await listTags()).toEqual(['night', 'reading-list'])
  })

  it('supports several entries on the same day, newest first', async () => {
    const a = makeEntry('2026-11-01')
    const b = { ...makeEntry('2026-11-01'), updatedAt: a.updatedAt + 10 }
    await saveEntry(a)
    await saveEntry(b)
    expect((await listEntries()).map((e) => e.id)).toEqual([b.id, a.id])
  })

  it('deleting an entry also deletes its margin notes, and only its own', async () => {
    const a = makeEntry()
    const b = makeEntry()
    await saveEntry(a)
    await saveEntry(b)
    await saveAnnotation({ ...makeAnnotation(a.id, 'p1', 'left'), text: 'mine' })
    await saveAnnotation({ ...makeAnnotation(b.id, 'p1', 'right'), text: 'theirs' })

    await deleteEntry(a.id)

    expect(await getEntry(a.id)).toBeUndefined()
    expect(await listAnnotations(a.id)).toEqual([])
    expect((await listAnnotations(b.id)).map((n) => n.text)).toEqual(['theirs'])
  })

  it('bumps updatedAt on every patch', () => {
    const entry = makeEntry()
    const next = applyEntryPatch(entry, { title: 'x' }, entry.updatedAt + 1000)
    expect(next.updatedAt).toBe(entry.updatedAt + 1000)
    expect(next.createdAt).toBe(entry.createdAt)
  })
})

describe('tags', () => {
  it('normalizes, de-duplicates and drops empty tags', () => {
    expect(normalizeTags(['  Dreams', 'dreams', '#Dreams', '', 'two words'])).toEqual(['dreams', 'two-words'])
  })
})

describe('preferences', () => {
  it('falls back to defaults and persists changes', async () => {
    expect(await loadPreferences()).toEqual(DEFAULT_PREFERENCES)
    await savePreferences({ ...DEFAULT_PREFERENCES, fontSize: 24, theme: 'dark' })
    const prefs = await loadPreferences()
    expect(prefs.fontSize).toBe(24)
    expect(prefs.theme).toBe('dark')
  })
})

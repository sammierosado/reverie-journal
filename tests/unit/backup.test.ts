import { beforeEach, describe, expect, it } from 'vitest'
import { freshDatabase, doc } from '../helpers'
import { BackupValidationError, createBackup, parseBackup, restoreBackup } from '../../src/db/backup'
import {
  applyEntryPatch,
  getEntry,
  listAnnotations,
  listEntries,
  makeAnnotation,
  makeEntry,
  saveAnnotation,
  saveEntry,
} from '../../src/db/repository'

beforeEach(() => {
  freshDatabase()
})

async function seed() {
  const entry = applyEntryPatch(makeEntry('2026-10-31'), { title: 'Samhain', content: doc({ text: 'Candles', pid: 'p1' }) })
  await saveEntry(entry)
  const note = { ...makeAnnotation(entry.id, 'p1', 'right'), text: 'Smoke and apples' }
  await saveAnnotation(note)
  return { entry, note }
}

describe('backup', () => {
  it('round-trips entries and margin notes through JSON', async () => {
    const { entry, note } = await seed()
    const json = JSON.stringify(await createBackup())

    freshDatabase()
    const result = await restoreBackup(parseBackup(json), 'replace')

    expect(result).toEqual({ entries: 1, annotations: 1 })
    expect((await getEntry(entry.id))?.title).toBe('Samhain')
    expect((await listAnnotations(entry.id))[0]).toEqual(note)
  })

  it('replace wipes entries that are not in the backup', async () => {
    await seed()
    const json = JSON.stringify(await createBackup())
    const extra = makeEntry()
    await saveEntry(extra)

    await restoreBackup(parseBackup(json), 'replace')
    expect((await listEntries()).some((e) => e.id === extra.id)).toBe(false)
  })

  it('merge keeps local entries and prefers the most recently edited copy', async () => {
    const { entry } = await seed()
    const backup = parseBackup(JSON.stringify(await createBackup()))
    const local = makeEntry()
    await saveEntry(local)
    // A newer local edit must survive merging an older backup.
    await saveEntry({ ...entry, title: 'Newer title', updatedAt: entry.updatedAt + 5000 })

    const result = await restoreBackup(backup, 'merge')

    expect(result.entries).toBe(0)
    expect((await getEntry(entry.id))?.title).toBe('Newer title')
    expect(await getEntry(local.id)).toBeDefined()
  })

  it.each([
    ['not json', 'This file is not valid JSON.'],
    ['{"app":"other"}', 'This file is not a Reverie Journal backup.'],
    ['{"app":"reverie-journal","formatVersion":99,"entries":[],"annotations":[]}', 'newer version'],
    ['{"app":"reverie-journal","formatVersion":1,"entries":[{"id":"x"}],"annotations":[]}', 'Entry 1 has invalid content.'],
  ])('rejects invalid backups: %s', (input, message) => {
    expect(() => parseBackup(input)).toThrow(BackupValidationError)
    expect(() => parseBackup(input)).toThrow(message)
  })

  it('rejects notes that point at entries missing from the backup', async () => {
    await seed()
    const backup = await createBackup()
    backup.annotations[0]!.entryId = 'ghost'
    expect(() => parseBackup(JSON.stringify(backup))).toThrow('belongs to an entry that is not in the backup')
  })
})

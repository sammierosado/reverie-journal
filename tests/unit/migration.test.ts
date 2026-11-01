import { describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { ReverieDB } from '../../src/db/database'

describe('database migrations', () => {
  it('upgrades v1 records to v2 without losing anything', async () => {
    const name = `migrate-${crypto.randomUUID()}`
    // Recreate the original v1 schema exactly as it shipped.
    const v1 = new Dexie(name)
    v1.version(1).stores({
      entries: 'id, entryDate, updatedAt, *tags',
      annotations: 'id, entryId, [entryId+paragraphId]',
      tags: 'name',
      preferences: 'id',
    })
    await v1.table('entries').put({
      id: 'e1',
      title: 'Old entry',
      content: { type: 'doc', content: [] },
      plainText: '',
      entryDate: '2026-01-01',
      createdAt: 1,
      updatedAt: 1,
      mood: null,
      tags: [],
      favorite: false,
      dataVersion: 1,
    })
    await v1.table('annotations').put({ id: 'a1', entryId: 'e1', paragraphId: 'p1', side: 'left', text: 'hi', createdAt: 1, updatedAt: 1 })
    v1.close()

    const db = new ReverieDB(name)
    const entry = await db.entries.get('e1')
    const note = await db.annotations.get('a1')
    expect(entry).toMatchObject({ title: 'Old entry', prompt: null, reminders: [], dataVersion: 2 })
    expect(note).toMatchObject({ text: 'hi', kind: 'note' })
    expect(db.verno).toBe(2)
    db.close()
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { freshDatabase, doc } from '../helpers'
import { useJournal, selectCurrentEntry } from '../../src/state/journalStore'
import { getEntry, listAnnotations, listEntries } from '../../src/db/repository'

const store = () => useJournal.getState()
const current = () => selectCurrentEntry(store())!

beforeEach(async () => {
  freshDatabase()
  await store().init()
})

describe('journal store', () => {
  it('opens straight onto a fresh page that is not saved until something is written', async () => {
    expect(store().ready).toBe(true)
    expect(store().draftId).toBe(store().currentId)
    await store().flush()
    expect(await listEntries()).toEqual([])

    store().updateEntry(current().id, { content: doc({ text: 'First words', pid: 'p1' }) })
    await store().flush()
    expect(store().draftId).toBeNull()
    expect((await getEntry(current().id))?.plainText).toBe('First words')
  })

  it('discards an untouched draft when another page is opened', async () => {
    const first = current().id
    await store().newEntry()
    expect(store().entries[first]).toBeUndefined()
  })

  it('persists margin notes on both sides and reloads them with the entry', async () => {
    const id = current().id
    store().updateEntry(id, { content: doc({ text: 'One', pid: 'p1' }, { text: 'Two', pid: 'p2' }) })
    const left = store().addAnnotation('p1', 'left')!
    const right = store().addAnnotation('p2', 'right', 'quote')!
    store().updateAnnotation(left.id, { text: 'A left thought' })
    store().updateAnnotation(right.id, { text: 'A quotation' })
    await store().flush()

    // Simulate closing and reopening the app.
    await store().init()
    expect(store().currentId).toBe(id)
    // Both notes can share a creation millisecond, so compare without relying on their order.
    const notes = [...store().annotations].sort((a, b) => a.side.localeCompare(b.side))
    expect(notes.map((n) => [n.side, n.paragraphId, n.text, n.kind])).toEqual([
      ['left', 'p1', 'A left thought', 'note'],
      ['right', 'p2', 'A quotation', 'quote'],
    ])
  })

  it('adding a note to a fresh page saves the page too, so the note is never orphaned', async () => {
    const id = current().id
    const note = store().addAnnotation('p1', 'right')!
    store().updateAnnotation(note.id, { text: 'hi' })
    await store().flush()
    expect(await getEntry(id)).toBeDefined()
    expect(await listAnnotations(id)).toHaveLength(1)
  })

  it('removes notes and deletes entries with their notes', async () => {
    const id = current().id
    store().updateEntry(id, { title: 'To delete' })
    const note = store().addAnnotation('p1', 'left')!
    store().updateAnnotation(note.id, { text: 'bye' })
    await store().flush()

    store().removeAnnotation(note.id)
    await store().flush()
    expect(await listAnnotations(id)).toEqual([])

    await store().removeEntry(id)
    expect(await getEntry(id)).toBeUndefined()
    // There is always a page to write on.
    expect(store().currentId).not.toBeNull()
  })

  it('navigates between entries, keeping each one’s content', async () => {
    const a = current().id
    store().updateEntry(a, { title: 'A' })
    const b = await store().newEntry('2026-10-01')
    store().updateEntry(b, { title: 'B' })
    await store().openEntry(a)
    expect(current().title).toBe('A')
    await store().openEntry(b)
    expect(current().title).toBe('B')
    expect(current().entryDate).toBe('2026-10-01')
  })
})

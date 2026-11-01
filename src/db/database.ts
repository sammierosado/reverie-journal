import Dexie, { type EntityTable } from 'dexie'
import type { JournalEntry, MarginAnnotation, Tag, UserPreferences } from './types'

export const DB_NAME = 'reverie-journal'

export class ReverieDB extends Dexie {
  entries!: EntityTable<JournalEntry, 'id'>
  annotations!: EntityTable<MarginAnnotation, 'id'>
  tags!: EntityTable<Tag, 'name'>
  preferences!: EntityTable<UserPreferences, 'id'>

  constructor(name = DB_NAME) {
    super(name)

    // v1: the original schema.
    this.version(1).stores({
      entries: 'id, entryDate, updatedAt, *tags',
      annotations: 'id, entryId, [entryId+paragraphId]',
      tags: 'name',
      preferences: 'id',
    })

    // v2: entries gain `prompt` and `reminders`; annotations gain `kind`.
    // Never edit a released version — add a new one with an upgrade function.
    this.version(2)
      .stores({
        entries: 'id, entryDate, updatedAt, *tags',
        annotations: 'id, entryId, [entryId+paragraphId]',
        tags: 'name',
        preferences: 'id',
      })
      .upgrade(async (tx) => {
        await tx
          .table('entries')
          .toCollection()
          .modify((entry: Partial<JournalEntry>) => {
            entry.prompt ??= null
            entry.reminders ??= []
            entry.dataVersion = 2
          })
        await tx
          .table('annotations')
          .toCollection()
          .modify((annotation: Partial<MarginAnnotation>) => {
            annotation.kind ??= 'note'
          })
      })
  }
}

export let db = new ReverieDB()

/** Tests use this to get a fresh, isolated database. */
export function setDatabase(instance: ReverieDB): void {
  db = instance
}

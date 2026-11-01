import { ReverieDB, setDatabase } from '../src/db/database'

/** Points the app at a brand-new, uniquely named IndexedDB (fake-indexeddb in tests). */
export function freshDatabase(): ReverieDB {
  const instance = new ReverieDB(`test-${crypto.randomUUID()}`)
  setDatabase(instance)
  return instance
}

export function doc(...paragraphs: (string | { text: string; pid: string })[]) {
  return {
    type: 'doc',
    content: paragraphs.map((p) =>
      typeof p === 'string'
        ? { type: 'paragraph', content: p ? [{ type: 'text', text: p }] : [] }
        : { type: 'paragraph', attrs: { pid: p.pid }, content: [{ type: 'text', text: p.text }] },
    ),
  }
}

import { create } from 'zustand'
import {
  applyEntryPatch,
  deleteAnnotation as dbDeleteAnnotation,
  deleteEntry as dbDeleteEntry,
  listAnnotations,
  listEntries,
  listTags,
  loadPreferences,
  makeAnnotation,
  makeEntry,
  saveAnnotation,
  saveEntry,
  savePreferences,
  type EntryPatch,
} from '../db/repository'
import {
  DEFAULT_PREFERENCES,
  type AnnotationKind,
  type JournalEntry,
  type MarginAnnotation,
  type MarginSide,
  type UserPreferences,
} from '../db/types'
import { toDayKey } from '../lib/dates'
import { createSaveQueue, type SaveState } from './saveQueue'

export interface JournalState {
  ready: boolean
  loadError: string | null
  /** All entries, keyed by id. Includes the unsaved draft, if any. */
  entries: Record<string, JournalEntry>
  /** A fresh entry that is not written to disk until the writer adds something to it. */
  draftId: string | null
  currentId: string | null
  /** Margin notes of the current entry. */
  annotations: MarginAnnotation[]
  allTags: string[]
  prefs: UserPreferences
  save: SaveState

  init: () => Promise<void>
  reload: () => Promise<void>
  openEntry: (id: string) => Promise<void>
  newEntry: (entryDate?: string) => Promise<string>
  updateEntry: (id: string, patch: EntryPatch) => void
  removeEntry: (id: string) => Promise<void>
  addAnnotation: (paragraphId: string, side: MarginSide, kind?: AnnotationKind) => MarginAnnotation | null
  updateAnnotation: (
    id: string,
    patch: Partial<Pick<MarginAnnotation, 'text' | 'kind' | 'paragraphId' | 'side'>>,
  ) => void
  removeAnnotation: (id: string) => void
  setPrefs: (patch: Partial<UserPreferences>) => void
  flush: () => Promise<void>
}

const queue = createSaveQueue((save) => useJournal.setState({ save }))

/** True once a draft holds anything worth keeping. */
function hasSubstance(entry: JournalEntry): boolean {
  return Boolean(
    entry.title.trim() ||
      entry.plainText.trim() ||
      entry.mood ||
      entry.tags.length ||
      entry.favorite ||
      entry.prompt ||
      entry.reminders.length,
  )
}

/** Picks what to show on launch: a recently touched entry, today's entry, or nothing (a fresh page). */
function pickStartEntry(entries: JournalEntry[], lastId: string | null): JournalEntry | undefined {
  const last = entries.find((e) => e.id === lastId)
  if (last && Date.now() - last.updatedAt < 12 * 60 * 60 * 1000) return last
  const today = toDayKey()
  return entries.filter((e) => e.entryDate === today).sort((a, b) => b.updatedAt - a.updatedAt)[0]
}

export const useJournal = create<JournalState>()((set, get) => {
  const scheduleEntrySave = (id: string, immediate = false) =>
    queue.schedule(
      `entry:${id}`,
      async () => {
        const { entries, draftId } = get()
        const entry = entries[id]
        if (entry && draftId !== id) await saveEntry(entry)
      },
      immediate,
    )

  const scheduleAnnotationSave = (id: string) =>
    queue.schedule(`note:${id}`, async () => {
      const note = get().annotations.find((a) => a.id === id)
      if (note) await saveAnnotation(note)
    })

  /** Writes a draft for the first time so that it, and anything attached to it, persists. */
  const promoteDraft = (id: string) => {
    if (get().draftId !== id) return
    set({ draftId: null })
    scheduleEntrySave(id, true)
    get().setPrefs({ lastEntryId: id })
  }

  const discardUntouchedDraft = () => {
    const { draftId, entries } = get()
    if (!draftId) return
    const rest = { ...entries }
    delete rest[draftId]
    set({ entries: rest, draftId: null })
  }

  const loadAll = async () => {
    const [list, prefs, allTags] = await Promise.all([listEntries(), loadPreferences(), listTags()])
    const entries = Object.fromEntries(list.map((e) => [e.id, e]))
    set({ entries, prefs, allTags, draftId: null, currentId: null, annotations: [] })
    const start = pickStartEntry(list, prefs.lastEntryId)
    if (start) await get().openEntry(start.id)
    else await get().newEntry()
  }

  return {
    ready: false,
    loadError: null,
    entries: {},
    draftId: null,
    currentId: null,
    annotations: [],
    allTags: [],
    prefs: DEFAULT_PREFERENCES,
    save: queue.getState(),

    async init() {
      try {
        await loadAll()
        set({ ready: true })
      } catch (err) {
        set({ loadError: err instanceof Error ? err.message : String(err), ready: true })
      }
    },

    async reload() {
      await queue.flush()
      await loadAll()
    },

    async openEntry(id) {
      if (id === get().currentId) return
      await queue.flush()
      discardUntouchedDraft()
      if (!get().entries[id]) return
      const annotations = await listAnnotations(id)
      set({ currentId: id, annotations })
      get().setPrefs({ lastEntryId: id })
    },

    async newEntry(entryDate) {
      await queue.flush()
      discardUntouchedDraft()
      const entry = makeEntry(entryDate)
      set((s) => ({
        entries: { ...s.entries, [entry.id]: entry },
        draftId: entry.id,
        currentId: entry.id,
        annotations: [],
      }))
      return entry.id
    },

    updateEntry(id, patch) {
      const entry = get().entries[id]
      if (!entry) return
      const next = applyEntryPatch(entry, patch)
      set((s) => ({ entries: { ...s.entries, [id]: next } }))
      if (patch.tags) set((s) => ({ allTags: [...new Set([...s.allTags, ...next.tags])].sort() }))
      if (get().draftId === id) {
        if (hasSubstance(next)) promoteDraft(id)
        return
      }
      scheduleEntrySave(id)
    },

    async removeEntry(id) {
      const wasCurrent = get().currentId === id
      const wasDraft = get().draftId === id
      await queue.flush()
      if (!wasDraft) await dbDeleteEntry(id)
      const rest = { ...get().entries }
      delete rest[id]
      set((s) => ({ entries: rest, draftId: wasDraft ? null : s.draftId }))
      if (wasCurrent) {
        set({ currentId: null, annotations: [] })
        const next = Object.values(rest).sort((a, b) => b.updatedAt - a.updatedAt)[0]
        if (next) await get().openEntry(next.id)
        else await get().newEntry()
      }
    },

    addAnnotation(paragraphId, side, kind = 'note') {
      const { currentId } = get()
      if (!currentId) return null
      promoteDraft(currentId)
      const note = makeAnnotation(currentId, paragraphId, side, kind)
      set((s) => ({ annotations: [...s.annotations, note] }))
      scheduleAnnotationSave(note.id)
      return note
    },

    updateAnnotation(id, patch) {
      set((s) => ({
        annotations: s.annotations.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: Date.now() } : a)),
      }))
      scheduleAnnotationSave(id)
    },

    removeAnnotation(id) {
      set((s) => ({ annotations: s.annotations.filter((a) => a.id !== id) }))
      queue.schedule(`note:${id}`, () => dbDeleteAnnotation(id), true)
    },

    setPrefs(patch) {
      set((s) => ({ prefs: { ...s.prefs, ...patch } }))
      queue.schedule('prefs', () => savePreferences(get().prefs))
    },

    flush: () => queue.flush(),
  }
})

if (import.meta.env.DEV) (globalThis as Record<string, unknown>).__reverie = useJournal

export const selectCurrentEntry =(s: JournalState): JournalEntry | undefined =>
  s.currentId ? s.entries[s.currentId] : undefined

export function hasPendingSaves(): boolean {
  return queue.hasPending()
}

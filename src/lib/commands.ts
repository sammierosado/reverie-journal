import { useJournal, selectCurrentEntry } from '../state/journalStore'
import { confirmAction, useUi } from '../state/uiStore'
import { focusParagraph, getActiveEditor, paragraphIdAtCursor } from '../editor/editorRegistry'
import { entryToMarkdown, journalToMarkdown, slugify } from '../db/markdown'
import { listAllAnnotations, listAnnotations } from '../db/repository'
import { createBackup } from '../db/backup'
import { downloadText } from './download'
import { randomPrompt } from './prompts'
import { toDayKey } from './dates'
import { MOODS, type MarginSide, type MoodId } from '../db/types'
import { getAesthetic, type AestheticId } from '../themes/aesthetics'

const journal = () => useJournal.getState()
const ui = () => useUi.getState()

export function focusEditor(): void {
  const editor = getActiveEditor()
  if (editor && !editor.isFocused) editor.view.focus()
}

export async function newEntry(entryDate?: string): Promise<void> {
  ui().close()
  await journal().newEntry(entryDate)
}

export async function openEntry(id: string): Promise<void> {
  ui().close()
  await journal().openEntry(id)
}

/** Sorted the way the journal reads: by day, then by when each entry was begun. */
export function chronologicalIds(): string[] {
  return Object.values(journal().entries)
    .sort((a, b) => a.entryDate.localeCompare(b.entryDate) || a.createdAt - b.createdAt)
    .map((e) => e.id)
}

export async function stepEntry(direction: -1 | 1): Promise<void> {
  const ids = chronologicalIds()
  const i = ids.indexOf(journal().currentId ?? '')
  const next = ids[i + direction]
  if (next) await openEntry(next)
}

export async function deleteCurrentEntry(): Promise<void> {
  const entry = selectCurrentEntry(journal())
  if (!entry) return
  const ok = await confirmAction({
    title: 'Delete this entry?',
    message: `“${entry.title.trim() || 'Untitled'}” and its margin notes will be permanently removed. Consider downloading a backup first.`,
    confirmLabel: 'Delete entry',
    danger: true,
  })
  if (!ok) return
  await journal().removeEntry(entry.id)
  ui().showToast('Entry deleted')
}

/** Adds a margin note beside the paragraph holding the cursor and moves focus into it. */
export function addNoteAtCursor(side: MarginSide): void {
  const pid = paragraphIdAtCursor()
  if (!pid) {
    ui().showToast('Place the cursor in a paragraph first')
    return
  }
  const note = journal().addAnnotation(pid, side)
  if (!note) return
  // On narrow screens margins live in the notes panel.
  const wide = window.matchMedia('(min-width: 74rem)').matches
  if (!wide || !journal().prefs.showMargins || ui().focusMode) {
    if (ui().focusMode) ui().setFocusMode(false)
    if (wide && !journal().prefs.showMargins) journal().setPrefs({ showMargins: true })
    else if (!wide) ui().open('notes')
  }
  ui().setFocusNote(note.id)
}

export function returnToParagraph(pid: string): void {
  focusParagraph(pid)
}

export function toggleFavorite(): void {
  const entry = selectCurrentEntry(journal())
  if (!entry) return
  journal().updateEntry(entry.id, { favorite: !entry.favorite })
  ui().showToast(entry.favorite ? 'Removed from favorites' : 'Added to favorites')
}

export function setMood(mood: MoodId | null): void {
  const entry = selectCurrentEntry(journal())
  if (!entry) return
  journal().updateEntry(entry.id, { mood })
  const label = MOODS.find((m) => m.id === mood)?.label
  ui().showToast(label ? `Mood: ${label}` : 'Mood cleared')
}

export function drawPrompt(): void {
  const entry = selectCurrentEntry(journal())
  if (!entry) return
  journal().updateEntry(entry.id, { prompt: randomPrompt(entry.prompt) })
}

export function dismissPrompt(): void {
  const entry = selectCurrentEntry(journal())
  if (entry) journal().updateEntry(entry.id, { prompt: null })
}

export function toggleMargins(): void {
  const { prefs, setPrefs } = journal()
  setPrefs({ showMargins: !prefs.showMargins })
}

export function toggleFocusMode(): void {
  ui().setFocusMode(!ui().focusMode)
  focusEditor()
}

export function toggleTypewriter(): void {
  const { prefs, setPrefs } = journal()
  setPrefs({ typewriterMode: !prefs.typewriterMode })
  ui().showToast(prefs.typewriterMode ? 'Typewriter mode off' : 'Typewriter mode on')
  focusEditor()
}

export function toggleTheme(): void {
  const dark = document.documentElement.dataset.theme === 'dark'
  journal().setPrefs({ theme: dark ? 'light' : 'dark' })
}

export function setAesthetic(id: AestheticId): void {
  journal().setPrefs({ aesthetic: id })
  ui().showToast(`Style: ${getAesthetic(id).name}`)
}

export function adjustFontSize(delta: number): void {
  const { prefs, setPrefs } = journal()
  setPrefs({ fontSize: Math.min(28, Math.max(15, prefs.fontSize + delta)) })
}

export async function exportCurrentEntryMarkdown(): Promise<void> {
  await journal().flush()
  const entry = selectCurrentEntry(journal())
  if (!entry) return
  const notes = journal().draftId === entry.id ? [] : await listAnnotations(entry.id)
  downloadText(`${entry.entryDate}-${slugify(entry.title)}.md`, entryToMarkdown(entry, notes), 'text/markdown')
}

export async function exportJournalMarkdown(): Promise<void> {
  await journal().flush()
  const { entries, draftId } = journal()
  const list = Object.values(entries).filter((e) => e.id !== draftId)
  downloadText(`reverie-journal-${toDayKey()}.md`, journalToMarkdown(list, await listAllAnnotations()), 'text/markdown')
}

export async function downloadBackup(): Promise<void> {
  await journal().flush()
  const backup = await createBackup()
  downloadText(`reverie-backup-${toDayKey()}.json`, JSON.stringify(backup, null, 2), 'application/json')
  journal().setPrefs({ lastBackupAt: Date.now() })
  ui().showToast('Backup downloaded')
}

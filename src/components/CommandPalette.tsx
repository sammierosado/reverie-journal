import { useEffect, useMemo, useRef, useState } from 'react'
import { useJournal } from '../state/journalStore'
import { useUi } from '../state/uiStore'
import { listAllAnnotations } from '../db/repository'
import { MOODS, moodById, type MarginAnnotation } from '../db/types'
import { highlightParts, queryTerms, searchEntries, fold } from '../lib/search'
import { excerpt } from '../editor/content'
import { formatShortDate } from '../lib/dates'
import * as cmd from '../lib/commands'
import { Modal } from './Modal'

interface Command {
  id: string
  label: string
  hint?: string
  run: () => void | Promise<void>
}

function useCommands(): Command[] {
  const ui = useUi.getState()
  return useMemo(
    () => [
      { id: 'new', label: 'New entry', hint: 'Alt N', run: () => cmd.newEntry() },
      { id: 'journal', label: 'Open journal & calendar', hint: 'Alt J', run: () => ui.open('journal') },
      { id: 'prev', label: 'Previous entry', hint: 'Alt PgUp', run: () => cmd.stepEntry(-1) },
      { id: 'next', label: 'Next entry', hint: 'Alt PgDn', run: () => cmd.stepEntry(1) },
      { id: 'note-left', label: 'Add a note in the left margin', hint: 'Ctrl [', run: () => cmd.addNoteAtCursor('left') },
      { id: 'note-right', label: 'Add a note in the right margin', hint: 'Ctrl ]', run: () => cmd.addNoteAtCursor('right') },
      { id: 'prompt', label: 'Draw a writing prompt', run: cmd.drawPrompt },
      { id: 'prompt-off', label: 'Put the prompt away', run: cmd.dismissPrompt },
      { id: 'fav', label: 'Toggle favorite', run: cmd.toggleFavorite },
      ...MOODS.map((m) => ({ id: `mood-${m.id}`, label: `Mood: ${m.label}`, hint: m.glyph, run: () => cmd.setMood(m.id) })),
      { id: 'mood-clear', label: 'Clear mood', run: () => cmd.setMood(null) },
      { id: 'focus', label: 'Focus mode', hint: 'Ctrl .', run: cmd.toggleFocusMode },
      { id: 'typewriter', label: 'Typewriter mode', run: cmd.toggleTypewriter },
      { id: 'margins', label: 'Show / hide margins', hint: 'Ctrl \\', run: cmd.toggleMargins },
      { id: 'theme', label: 'Switch light / dark theme', run: cmd.toggleTheme },
      { id: 'bigger', label: 'Larger text', hint: 'Ctrl =', run: () => cmd.adjustFontSize(1) },
      { id: 'smaller', label: 'Smaller text', hint: 'Ctrl -', run: () => cmd.adjustFontSize(-1) },
      { id: 'title', label: 'Edit the title', run: () => document.getElementById('entry-title')?.focus() },
      { id: 'export-entry', label: 'Export this entry as Markdown', run: cmd.exportCurrentEntryMarkdown },
      { id: 'export-all', label: 'Export the whole journal as Markdown', run: cmd.exportJournalMarkdown },
      { id: 'backup', label: 'Download a full backup (JSON)', run: cmd.downloadBackup },
      { id: 'restore', label: 'Restore from a backup…', run: () => ui.open('settings') },
      { id: 'settings', label: 'Settings', hint: 'Ctrl ,', run: () => ui.open('settings') },
      { id: 'shortcuts', label: 'Keyboard shortcuts', hint: 'Ctrl /', run: () => ui.open('shortcuts') },
      { id: 'delete', label: 'Delete this entry…', run: cmd.deleteCurrentEntry },
    ],
    [ui],
  )
}

type Row = { kind: 'entry'; id: string; title: string; meta: string; snippet: string } | { kind: 'command'; command: Command }

export function CommandPalette() {
  const close = useUi((s) => s.close)
  const entries = useJournal((s) => s.entries)
  const draftId = useJournal((s) => s.draftId)
  const currentId = useJournal((s) => s.currentId)
  const commands = useCommands()
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const [notes, setNotes] = useState<MarginAnnotation[]>([])
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    void useJournal.getState().flush().then(listAllAnnotations).then(setNotes)
  }, [])

  const terms = queryTerms(query)
  const rows: Row[] = useMemo(() => {
    const list = Object.values(entries).filter((e) => e.id !== draftId)
    const entryRows: Row[] = (
      terms.length
        ? searchEntries(list, notes, query, 20).map((h) => ({ e: h.entry, snippet: h.snippet }))
        : list
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .filter((e) => e.id !== currentId)
            .slice(0, 6)
            .map((e) => ({ e, snippet: excerpt(e.plainText, 110) }))
    ).map(({ e, snippet }) => ({
      kind: 'entry',
      id: e.id,
      title: e.title.trim() || 'Untitled',
      meta: [formatShortDate(e.entryDate), moodById(e.mood)?.glyph, e.favorite ? '★' : ''].filter(Boolean).join('  '),
      snippet,
    }))
    const commandRows: Row[] = commands
      .filter((c) => terms.every((t) => fold(c.label).includes(t)))
      .map((command) => ({ kind: 'command', command }))
    // When typing, matching entries come first; with no query, commands lead.
    return terms.length ? [...entryRows, ...commandRows] : [...commandRows.slice(0, 6), ...entryRows, ...commandRows.slice(6)]
  }, [entries, draftId, currentId, notes, query, commands]) // `terms` derives from `query`

  useEffect(() => setIndex(0), [query])
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [index])

  const choose = async (row: Row | undefined) => {
    if (!row) return
    close()
    if (row.kind === 'entry') await cmd.openEntry(row.id)
    else await row.command.run()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndex((i) => Math.min(rows.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndex((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      void choose(rows[index])
    }
  }

  const activeId = rows[index] ? `palette-row-${index}` : undefined

  return (
    <Modal title="Search & commands" onClose={close} hideTitle width="40rem" initialFocus="input">
      <div className="border-b border-line px-5 py-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search your journal, or type a command…"
          aria-label="Search your journal or type a command"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={activeId}
          className="w-full bg-transparent font-display text-2xl italic text-ink outline-none placeholder:text-ink-muted/70"
        />
      </div>
      <ul id="palette-list" ref={listRef} role="listbox" aria-label="Results" className="max-h-[55vh] overflow-y-auto py-2">
        {rows.length === 0 && (
          <li className="px-6 py-10 text-center font-serif text-lg italic text-ink-muted">Nothing yet beneath these stars.</li>
        )}
        {rows.map((row, i) => (
          <li
            key={row.kind === 'entry' ? `e-${row.id}` : `c-${row.command.id}`}
            id={`palette-row-${i}`}
            data-index={i}
            role="option"
            aria-selected={i === index}
            onMouseMove={() => setIndex(i)}
            onClick={() => void choose(row)}
            className={`palette-row ${i === index ? 'is-active' : ''}`}
          >
            {row.kind === 'entry' ? (
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-display text-lg">
                    {highlightParts(row.title, terms).map((p, k) => (p.match ? <mark key={k}>{p.text}</mark> : p.text))}
                  </span>
                  <span className="shrink-0 font-sans text-[11px] tracking-wide text-ink-muted">{row.meta}</span>
                </div>
                {row.snippet && (
                  <p className="truncate font-serif text-[15px] text-ink-muted">
                    {highlightParts(row.snippet, terms).map((p, k) => (p.match ? <mark key={k}>{p.text}</mark> : p.text))}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <span className="font-sans text-[14px]">{row.command.label}</span>
                {row.command.hint && <kbd>{row.command.hint}</kbd>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </Modal>
  )
}

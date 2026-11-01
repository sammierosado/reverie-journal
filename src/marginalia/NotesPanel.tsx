import { useMemo } from 'react'
import { useJournal, selectCurrentEntry } from '../state/journalStore'
import { useUi } from '../state/uiStore'
import { extractParagraphs, excerpt } from '../editor/content'
import { focusParagraph } from '../editor/editorRegistry'
import { addNoteAtCursor } from '../lib/commands'
import { Modal } from '../components/Modal'
import { NoteCard } from './NoteCard'

/** On narrow screens the margins collapse into this panel: the same notes, listed by paragraph. */
export function NotesPanel() {
  const close = useUi((s) => s.close)
  const entry = useJournal(selectCurrentEntry)
  const annotations = useJournal((s) => s.annotations)

  const groups = useMemo(() => {
    const paragraphs = entry ? extractParagraphs(entry.content) : []
    const known = new Set(paragraphs.map((p) => p.id))
    const anchored = paragraphs
      .map((p) => ({ paragraph: p, notes: annotations.filter((a) => a.paragraphId === p.id) }))
      .filter((g) => g.notes.length > 0)
    const detached = annotations.filter((a) => !known.has(a.paragraphId))
    return { anchored, detached }
  }, [entry, annotations])

  const goTo = (pid: string) => {
    close()
    requestAnimationFrame(() => focusParagraph(pid))
  }

  return (
    <Modal title="Margin notes" onClose={close} variant="drawer-right" width="26rem">
      <div className="flex flex-col gap-6 px-6 pb-8">
        <div className="flex gap-2">
          <button type="button" className="btn flex-1 justify-center" onClick={() => addNoteAtCursor('left')}>
            Left note here
          </button>
          <button type="button" className="btn flex-1 justify-center" onClick={() => addNoteAtCursor('right')}>
            Right note here
          </button>
        </div>
        <p className="-mt-3 font-sans text-[12px] text-ink-muted">Notes attach to the paragraph holding your cursor.</p>

        {groups.anchored.length === 0 && groups.detached.length === 0 && (
          <p className="py-6 text-center font-serif text-lg italic text-ink-muted">The margins are still blank.</p>
        )}

        {groups.anchored.map(({ paragraph, notes }) => (
          <section key={paragraph.id} className="flex flex-col gap-2">
            <button type="button" onClick={() => goTo(paragraph.id)} className="text-left font-serif text-[15px] italic text-ink-muted hover:text-ink">
              “{excerpt(paragraph.text, 90) || 'An empty line'}”
            </button>
            {notes.map((n) => (
              <div key={n.id}>
                <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-ink-muted">{n.side} margin</span>
                <NoteCard note={n} />
              </div>
            ))}
          </section>
        ))}

        {groups.detached.length > 0 && (
          <section className="flex flex-col gap-2 border-t border-line pt-4">
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink-muted">Detached notes</p>
            {groups.detached.map((n) => (
              <NoteCard key={n.id} note={n} />
            ))}
          </section>
        )}
      </div>
    </Modal>
  )
}

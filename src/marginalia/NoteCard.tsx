import { forwardRef, useEffect, useLayoutEffect, useRef, type FocusEvent, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { ANNOTATION_KINDS, type MarginAnnotation } from '../db/types'
import { useJournal } from '../state/journalStore'
import { confirmAction, useUi } from '../state/uiStore'
import { focusParagraph } from '../editor/editorRegistry'

interface Props {
  note: MarginAnnotation
  style?: React.CSSProperties
  className?: string
}

const KIND_PLACEHOLDER: Record<MarginAnnotation['kind'], string> = {
  note: 'A thought in the margin…',
  reflection: 'Looking back, I…',
  quote: 'Words worth keeping…',
  question: 'I wonder…',
}

function autoGrow(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

export async function confirmDeleteNote(note: MarginAnnotation): Promise<void> {
  const ok =
    !note.text.trim() ||
    (await confirmAction({
      title: 'Erase this margin note?',
      message: 'The note will be removed from this entry. This cannot be undone.',
      confirmLabel: 'Erase note',
      danger: true,
    }))
  if (ok) useJournal.getState().removeAnnotation(note.id)
}

export const NoteCard = forwardRef<HTMLDivElement, Props>(function NoteCard({ note, style, className = '' }, ref) {
  const textRef = useRef<HTMLTextAreaElement>(null)
  const updateAnnotation = useJournal((s) => s.updateAnnotation)
  const removeAnnotation = useJournal((s) => s.removeAnnotation)
  const focusNoteId = useUi((s) => s.focusNoteId)
  const setActiveParagraph = useUi((s) => s.setActiveParagraph)
  const active = useUi((s) => s.activeParagraphId === note.paragraphId)

  useLayoutEffect(() => autoGrow(textRef.current), [note.text])

  useEffect(() => {
    if (focusNoteId !== note.id) return
    textRef.current?.focus({ preventScroll: false })
    useUi.getState().setFocusNote(null)
  }, [focusNoteId, note.id])

  const cycleKind = () => {
    const i = ANNOTATION_KINDS.findIndex((k) => k.id === note.kind)
    const next = ANNOTATION_KINDS[(i + 1) % ANNOTATION_KINDS.length]!
    updateAnnotation(note.id, { kind: next.id })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
      e.preventDefault()
      e.stopPropagation()
      focusParagraph(note.paragraphId)
    }
  }

  // A note left empty disappears quietly, so the margins stay blank by default.
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
    setActiveParagraph(null)
    if (!note.text.trim()) removeAnnotation(note.id)
  }

  const kindLabel = ANNOTATION_KINDS.find((k) => k.id === note.kind)?.label ?? 'Note'

  return (
    <div
      ref={ref}
      style={style}
      data-note-id={note.id}
      data-side={note.side}
      className={`note-card group ${active ? 'is-active' : ''} ${className}`}
      onMouseEnter={() => setActiveParagraph(note.paragraphId)}
      onMouseLeave={(e) => {
        if (!e.currentTarget.contains(document.activeElement)) setActiveParagraph(null)
      }}
      onFocus={() => setActiveParagraph(note.paragraphId)}
      onBlur={onBlur}
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={cycleKind}
          className="note-kind"
          title="Change note type"
          aria-label={`Note type: ${kindLabel}. Activate to change.`}
        >
          {kindLabel}
        </button>
        <button
          type="button"
          onClick={() => void confirmDeleteNote(note)}
          className="note-delete"
          aria-label="Erase margin note"
          title="Erase note"
        >
          <X size={13} strokeWidth={1.5} aria-hidden />
        </button>
      </div>
      <textarea
        ref={textRef}
        value={note.text}
        rows={1}
        onChange={(e) => updateAnnotation(note.id, { text: e.target.value })}
        onKeyDown={onKeyDown}
        placeholder={KIND_PLACEHOLDER[note.kind]}
        aria-label={`${kindLabel} in the ${note.side} margin`}
        className={`note-text ${note.kind === 'quote' ? 'italic' : ''}`}
      />
    </div>
  )
})

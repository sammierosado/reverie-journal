import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link2, Plus } from 'lucide-react'
import type { MarginAnnotation, MarginSide } from '../db/types'
import { useJournal } from '../state/journalStore'
import { useUi } from '../state/uiStore'
import { paragraphIdAtCursor } from '../editor/editorRegistry'
import { layoutNotes, paragraphAtY, type ParagraphBox } from './layout'
import { NoteCard } from './NoteCard'

interface Props {
  side: MarginSide
  notes: MarginAnnotation[]
  boxes: ReadonlyMap<string, ParagraphBox>
  /** Every pid currently in the document; notes pointing elsewhere are "detached". */
  docPids: ReadonlySet<string>
  /** Content pinned to the top of the margin (entry details, prompt). Notes flow below it. */
  header?: ReactNode
}

const LEADER_OFFSET = 15
const NOTE_INSET = 28

export function MarginColumn({ side, notes, boxes, docPids, header }: Props) {
  const addAnnotation = useJournal((s) => s.addAnnotation)
  const updateAnnotation = useJournal((s) => s.updateAnnotation)
  const setFocusNote = useUi((s) => s.setFocusNote)
  const columnRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const [heights, setHeights] = useState<Record<string, number>>({})
  const [headerHeight, setHeaderHeight] = useState(0)
  const [width, setWidth] = useState(0)
  const [hoverPid, setHoverPid] = useState<string | null>(null)

  // One observer measures every note card, so stacking reacts to notes growing as you type.
  // Created in an effect (not memoized) so it survives effect re-runs.
  const observerRef = useRef<ResizeObserver | null>(null)
  useEffect(() => {
    const observer = new ResizeObserver((records) => {
      setHeights((prev) => {
        let next = prev
        for (const r of records) {
          const id = (r.target as HTMLElement).dataset.noteId
          const h = Math.round((r.target as HTMLElement).offsetHeight)
          if (id && prev[id] !== h) next = { ...next, [id]: h }
        }
        return next
      })
    })
    observerRef.current = observer
    columnRef.current?.querySelectorAll<HTMLElement>('.note-card').forEach((el) => observer.observe(el))
    return () => {
      observer.disconnect()
      observerRef.current = null
    }
  }, [])

  // Cards mounted after the observer exists register themselves.
  const cardRef = useCallback((el: HTMLDivElement | null) => {
    if (el) observerRef.current?.observe(el)
  }, [])

  useEffect(() => {
    const el = columnRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setHeaderHeight(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const anchoredNotes = notes.filter((n) => docPids.has(n.paragraphId))
  const detachedNotes = docPids.size ? notes.filter((n) => !docPids.has(n.paragraphId)) : []

  // The header behaves like an invisible note at the top that everything must clear.
  const placed = useMemo(() => {
    const HEADER = '__header__'
    const withHeader = new Map(boxes)
    withHeader.set(HEADER, { top: -1, height: 0 })
    const all = layoutNotes(
      [{ id: HEADER, paragraphId: HEADER, createdAt: 0 }, ...anchoredNotes],
      withHeader,
      { ...heights, [HEADER]: headerHeight ? headerHeight + 8 : 0 },
    )
    return all.filter((p) => p.id !== HEADER)
  }, [anchoredNotes, boxes, heights, headerHeight])

  const bottom = placed.reduce((max, p) => Math.max(max, p.top + (heights[p.id] ?? 64)), 0)
  const lastParagraphBottom = [...boxes.values()].reduce((m, b) => Math.max(m, b.top + b.height), 0)
  const detachedTop = Math.max(bottom, lastParagraphBottom, headerHeight) + 40

  const onMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement
    if (target.closest('.note-card, .margin-header, .detached-notes, .margin-add')) {
      if (!target.closest('.margin-add')) setHoverPid(null)
      return
    }
    const top = columnRef.current!.getBoundingClientRect().top
    setHoverPid(paragraphAtY(boxes, e.clientY - top))
  }

  const create = (pid: string) => {
    const note = addAnnotation(pid, side)
    if (note) setFocusNote(note.id)
    setHoverPid(null)
  }

  const reattach = (note: MarginAnnotation) => {
    const pid = paragraphIdAtCursor()
    if (pid) updateAnnotation(note.id, { paragraphId: pid })
  }

  const hoverBox = hoverPid ? boxes.get(hoverPid) : undefined
  const edgeX = side === 'left' ? width : 0
  const noteEdgeX = side === 'left' ? width - NOTE_INSET : NOTE_INSET

  return (
    <aside
      ref={columnRef}
      aria-label={side === 'left' ? 'Left margin' : 'Right margin'}
      className={`margin-column relative h-full ${side === 'left' ? 'pr-0' : 'pl-0'}`}
      onMouseMove={onMouseMove}
      onMouseLeave={() => setHoverPid(null)}
    >
      <div ref={headerRef} className="margin-header absolute inset-x-0 top-0" style={{ [side === 'left' ? 'paddingRight' : 'paddingLeft']: NOTE_INSET }}>
        {header}
      </div>

      <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        {placed.map((p) => {
          const note = anchoredNotes.find((n) => n.id === p.id)!
          return (
            <g key={p.id} className="margin-leader" data-pid={note.paragraphId}>
              <line
                x1={edgeX}
                y1={p.anchorTop + LEADER_OFFSET}
                x2={noteEdgeX}
                y2={p.top + LEADER_OFFSET}
              />
            </g>
          )
        })}
      </svg>

      {placed.map((p) => {
        const note = anchoredNotes.find((n) => n.id === p.id)!
        return (
          <NoteCard
            key={note.id}
            ref={cardRef}
            note={note}
            className="absolute"
            style={{
              top: p.top,
              [side === 'left' ? 'right' : 'left']: NOTE_INSET,
              [side === 'left' ? 'left' : 'right']: 0,
            }}
          />
        )
      })}

      {hoverBox && hoverPid && (
        <button
          type="button"
          className="margin-add absolute"
          style={{ top: hoverBox.top + 2, [side === 'left' ? 'right' : 'left']: 4 }}
          onClick={() => create(hoverPid)}
          aria-label={`Add a note in the ${side} margin beside this paragraph`}
          title={`Add a ${side} margin note (${side === 'left' ? 'Ctrl+[' : 'Ctrl+]'})`}
        >
          <Plus size={14} strokeWidth={1.5} aria-hidden />
        </button>
      )}

      {detachedNotes.length > 0 && (
        <section
          className="detached-notes absolute inset-x-0"
          style={{ top: detachedTop, [side === 'left' ? 'paddingRight' : 'paddingLeft']: NOTE_INSET }}
          aria-label="Detached notes"
        >
          <p className="mb-2 font-sans text-[11px] uppercase tracking-[0.18em] text-ink-muted">Detached notes</p>
          <p className="mb-3 font-serif text-sm italic text-ink-muted">Their paragraph was removed. Re-attach or erase them.</p>
          <div className="flex flex-col gap-3">
            {detachedNotes.map((note) => (
              <div key={note.id}>
                <NoteCard note={note} />
                <button type="button" className="quiet-link mt-1" onClick={() => reattach(note)}>
                  <Link2 size={12} aria-hidden /> Attach to the paragraph at the cursor
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </aside>
  )
}

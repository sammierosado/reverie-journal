import { useCallback, useMemo, useRef } from 'react'
import type { JSONContent } from '@tiptap/core'
import type { JournalEntry, MarginAnnotation } from '../db/types'
import { useJournal } from '../state/journalStore'
import { useUi } from '../state/uiStore'
import { JournalEditor } from '../editor/JournalEditor'
import { extractParagraphs, countWords } from '../editor/content'
import { focusEditorAt } from '../editor/editorRegistry'
import { MarginColumn } from '../marginalia/MarginColumn'
import { useParagraphBoxes } from '../marginalia/useParagraphBoxes'
import { useMediaQuery, WIDE_QUERY } from '../lib/useMediaQuery'
import { formatLongDate } from '../lib/dates'
import { getAesthetic } from '../themes/aesthetics'
import { useAutoSize } from '../lib/useAutoSize'
import { EntryMeta } from './EntryMeta'
import { PromptCard } from './PromptCard'
import { CelestialDivider, PageCorners } from './Ornaments'

/** CSS for paragraph markers and the highlight linking a note to its paragraph. */
function useMarginStyles(annotations: MarginAnnotation[], activePid: string | null): string {
  return useMemo(() => {
    const sides = new Map<string, Set<string>>()
    for (const a of annotations) {
      if (!a.text.trim() && a.paragraphId !== activePid) continue
      sides.set(a.paragraphId, (sides.get(a.paragraphId) ?? new Set()).add(a.side))
    }
    const rules: string[] = []
    for (const [pid, set] of sides) {
      const vars = [set.has('left') && '--marker-l:1.5px', set.has('right') && '--marker-r:1.5px'].filter(Boolean)
      rules.push(`.reverie-prose [data-pid="${CSS.escape(pid)}"]{${vars.join(';')}}`)
    }
    if (activePid) {
      const sel = CSS.escape(activePid)
      rules.push(`.reverie-prose [data-pid="${sel}"]{background:var(--rv-highlight);box-shadow:0 0 0 .4em var(--rv-highlight);border-radius:2px}`)
      rules.push(`.margin-leader[data-pid="${sel}"] line{stroke-opacity:.9}`)
    }
    return rules.join('\n')
  }, [annotations, activePid])
}

export function Page({ entry }: { entry: JournalEntry }) {
  const updateEntry = useJournal((s) => s.updateEntry)
  const annotations = useJournal((s) => s.annotations)
  const prefs = useJournal((s) => s.prefs)
  const focusMode = useUi((s) => s.focusMode)
  const activePid = useUi((s) => s.activeParagraphId)
  const wide = useMediaQuery(WIDE_QUERY)
  const rowRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)

  const showMargins = wide && prefs.showMargins && !focusMode
  const docPids = useMemo(() => new Set(extractParagraphs(entry.content).map((p) => p.id)), [entry.content])
  const boxes = useParagraphBoxes(rowRef, [entry.content, prefs.fontSize, prefs.lineHeight, prefs.aesthetic, showMargins, entry.title])
  const marginCss = useMarginStyles(annotations, activePid)
  const words = useMemo(() => countWords(entry.plainText), [entry.plainText])
  // Each style speaks in its own voice; stable per entry, so the invitation doesn't change while you look at it.
  const placeholders = getAesthetic(prefs.aesthetic).placeholders
  const placeholder = placeholders[parseInt(entry.id.slice(0, 6), 16) % placeholders.length]!

  useAutoSize(titleRef, [entry.title, prefs.aesthetic, showMargins])

  const onContent = useCallback((content: JSONContent) => updateEntry(entry.id, { content }), [entry.id, updateEntry])
  const focusTitle = useCallback(() => {
    const el = titleRef.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [])

  const onTitleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget
    const atEnd = el.selectionStart === el.value.length
    if (e.key === 'Enter' || (e.key === 'ArrowDown' && atEnd)) {
      e.preventDefault()
      focusEditorAt('start')
    }
  }

  const left = annotations.filter((a) => a.side === 'left')
  const right = annotations.filter((a) => a.side === 'right')

  return (
    <div
      ref={rowRef}
      className={`sheet-row ${showMargins ? 'with-margins' : ''}`}
      style={{ '--body-size': `${prefs.fontSize}px`, '--body-leading': prefs.lineHeight } as React.CSSProperties}
    >
      <style>{marginCss}</style>

      {showMargins && (
        <MarginColumn side="left" notes={left} boxes={boxes} docPids={docPids} header={<EntryMeta entry={entry} />} />
      )}

      <article className="page" aria-label="Journal page">
        <PageCorners />

        <header className="mb-2">
          {!showMargins && !focusMode ? (
            <div className="mb-6">
              <EntryMeta entry={entry} compact />
            </div>
          ) : (
            <p className="mb-3 font-sans text-[11px] uppercase tracking-[0.24em] text-ink-muted">
              {formatLongDate(entry.entryDate)}
            </p>
          )}
          <label className="sr-only" htmlFor="entry-title">
            Title
          </label>
          <textarea
            id="entry-title"
            ref={titleRef}
            rows={1}
            value={entry.title}
            onChange={(e) => updateEntry(entry.id, { title: e.target.value.replace(/\n/g, ' ') })}
            onKeyDown={onTitleKey}
            placeholder="Untitled"
            className="page-title"
          />
          <CelestialDivider className="mt-3 mb-8" />
        </header>

        {!showMargins && !focusMode && entry.prompt && (
          <div className="mb-8">
            <PromptCard prompt={entry.prompt} />
          </div>
        )}

        <JournalEditor
          key={entry.id}
          initialContent={entry.content}
          onChange={onContent}
          onExitTop={focusTitle}
          typewriterMode={prefs.typewriterMode}
          placeholder={placeholder}
        />

        <footer className="page-footer" aria-live="off">
          <span>{words === 1 ? '1 word' : `${words.toLocaleString()} words`}</span>
        </footer>
      </article>

      {showMargins && (
        <MarginColumn
          side="right"
          notes={right}
          boxes={boxes}
          docPids={docPids}
          header={entry.prompt ? <PromptCard prompt={entry.prompt} /> : null}
        />
      )}
    </div>
  )
}

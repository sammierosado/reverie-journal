import { useMemo, useState } from 'react'
import { Feather, Plus, Star } from 'lucide-react'
import { useJournal } from '../state/journalStore'
import { useUi } from '../state/uiStore'
import { moodById, type JournalEntry } from '../db/types'
import { excerpt } from '../editor/content'
import { formatLongDate, fromDayKey, toDayKey } from '../lib/dates'
import { newEntry, openEntry, downloadBackup } from '../lib/commands'
import { Calendar } from './Calendar'
import { Modal } from './Modal'

type Filter = 'all' | 'favorites'

function groupByMonth(entries: JournalEntry[]): [string, JournalEntry[]][] {
  const groups = new Map<string, JournalEntry[]>()
  for (const e of entries) {
    const label = fromDayKey(e.entryDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    groups.set(label, [...(groups.get(label) ?? []), e])
  }
  return [...groups]
}

const BACKUP_NUDGE_DAYS = 14

export function JournalDrawer() {
  const close = useUi((s) => s.close)
  const entriesMap = useJournal((s) => s.entries)
  const draftId = useJournal((s) => s.draftId)
  const currentId = useJournal((s) => s.currentId)
  const lastBackupAt = useJournal((s) => s.prefs.lastBackupAt)
  const allTags = useJournal((s) => s.allTags)
  const [day, setDay] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [tag, setTag] = useState('')

  const saved = useMemo(() => Object.values(entriesMap).filter((e) => e.id !== draftId), [entriesMap, draftId])
  const markedDays = useMemo(() => new Set(saved.map((e) => e.entryDate)), [saved])
  const visible = useMemo(
    () =>
      saved
        .filter((e) => (day ? e.entryDate === day : true))
        .filter((e) => (filter === 'favorites' ? e.favorite : true))
        .filter((e) => (tag ? e.tags.includes(tag) : true))
        .sort((a, b) => b.entryDate.localeCompare(a.entryDate) || b.createdAt - a.createdAt),
    [saved, day, filter, tag],
  )

  const needsBackup =
    saved.length > 0 && (!lastBackupAt || Date.now() - lastBackupAt > BACKUP_NUDGE_DAYS * 24 * 60 * 60 * 1000)

  const onListKey = (e: React.KeyboardEvent<HTMLUListElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const items = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button.entry-row')]
    const i = items.indexOf(document.activeElement as HTMLButtonElement)
    const next = items[e.key === 'ArrowDown' ? i + 1 : i - 1]
    if (next) {
      e.preventDefault()
      next.focus()
    }
  }

  return (
    <Modal title="Journal" onClose={close} variant="drawer-left" width="24rem" initialFocus=".entry-row.is-current, .entry-row">
      <div className="flex flex-col gap-5 px-6 pb-6">
        <button type="button" className="btn btn-primary w-full justify-center" onClick={() => void newEntry()}>
          <Plus size={15} strokeWidth={1.6} aria-hidden /> New entry <kbd className="ml-2">Alt N</kbd>
        </button>

        <Calendar markedDays={markedDays} selected={day} onSelect={(d) => setDay(d === day ? null : d)} />

        <div className="flex flex-wrap items-center gap-2 font-sans text-[12px]">
          <div role="group" aria-label="Filter" className="segmented">
            <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
              All
            </button>
            <button type="button" aria-pressed={filter === 'favorites'} onClick={() => setFilter('favorites')}>
              <Star size={11} aria-hidden /> Favorites
            </button>
          </div>
          {allTags.length > 0 && (
            <select value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Filter by tag" className="select-quiet">
              <option value="">Any tag</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>
          )}
        </div>

        {day && (
          <div className="flex items-center justify-between border-y border-line py-2.5">
            <span className="font-display text-lg italic">{formatLongDate(day)}</span>
            <button type="button" className="quiet-link" onClick={() => void newEntry(day)}>
              <Feather size={12} aria-hidden /> Write for this day
            </button>
          </div>
        )}

        {visible.length === 0 ? (
          <p className="py-8 text-center font-serif text-lg italic leading-relaxed text-ink-muted">
            {saved.length === 0
              ? 'Your journal is waiting for its first page.'
              : day
                ? day === toDayKey()
                  ? 'Nothing written today — yet.'
                  : 'No pages on this day.'
                : 'No entries match.'}
          </p>
        ) : (
          <ul className="flex flex-col" aria-label="Entries" onKeyDown={onListKey}>
            {groupByMonth(visible).map(([month, items]) => (
              <li key={month}>
                <p className="mt-2 mb-1 font-sans text-[10px] uppercase tracking-[0.24em] text-ink-muted">{month}</p>
                <ul>
                  {items.map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        className={`entry-row ${e.id === currentId ? 'is-current' : ''}`}
                        aria-current={e.id === currentId ? 'page' : undefined}
                        onClick={() => void openEntry(e.id)}
                      >
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate font-display text-[19px]">{e.title.trim() || 'Untitled'}</span>
                          <span className="shrink-0 font-sans text-[11px] text-ink-muted">
                            {moodById(e.mood)?.glyph} {e.favorite && <span className="text-gold">★</span>}{' '}
                            {fromDayKey(e.entryDate).getDate()}
                          </span>
                        </span>
                        {e.plainText && <span className="line-clamp-2 font-serif text-[14px] text-ink-muted">{excerpt(e.plainText, 120)}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}

        {needsBackup && (
          <div className="border-t border-line pt-4 font-sans text-[12px] leading-relaxed text-ink-muted">
            Your journal lives only in this browser.{' '}
            <button type="button" className="quiet-link inline" onClick={() => void downloadBackup()}>
              Download a backup
            </button>{' '}
            {lastBackupAt ? `— the last was ${new Date(lastBackupAt).toLocaleDateString()}.` : '— none yet.'}
          </div>
        )}
      </div>
    </Modal>
  )
}

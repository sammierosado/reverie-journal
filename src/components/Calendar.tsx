import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { fromDayKey, toDayKey } from '../lib/dates'

interface Props {
  /** Days that have at least one entry. */
  markedDays: ReadonlySet<string>
  selected: string | null
  onSelect: (day: string) => void
}

function addDays(key: string, n: number): string {
  const d = fromDayKey(key)
  d.setDate(d.getDate() + n)
  return toDayKey(d)
}

/** A small month view. Arrow keys move by day/week, PageUp/PageDown by month, Enter selects. */
export function Calendar({ markedDays, selected, onSelect }: Props) {
  const today = toDayKey()
  const [cursor, setCursor] = useState(selected ?? today)
  const gridRef = useRef<HTMLDivElement>(null)
  const month = fromDayKey(cursor)
  const year = month.getFullYear()
  const m = month.getMonth()

  const days = useMemo(() => {
    const first = new Date(year, m, 1)
    // Weeks start on Monday.
    const lead = (first.getDay() + 6) % 7
    const count = new Date(year, m + 1, 0).getDate()
    const cells: (string | null)[] = Array.from({ length: lead }, () => null)
    for (let d = 1; d <= count; d++) cells.push(toDayKey(new Date(year, m, d)))
    return cells
  }, [year, m])

  const move = (key: string) => {
    setCursor(key)
    requestAnimationFrame(() => gridRef.current?.querySelector<HTMLElement>(`[data-day="${key}"]`)?.focus())
  }

  const shiftMonth = (n: number) => {
    const d = fromDayKey(cursor)
    const target = new Date(d.getFullYear(), d.getMonth() + n, 1)
    const day = Math.min(d.getDate(), new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate())
    return toDayKey(new Date(target.getFullYear(), target.getMonth(), day))
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const map: Record<string, () => string> = {
      ArrowLeft: () => addDays(cursor, -1),
      ArrowRight: () => addDays(cursor, 1),
      ArrowUp: () => addDays(cursor, -7),
      ArrowDown: () => addDays(cursor, 7),
      PageUp: () => shiftMonth(-1),
      PageDown: () => shiftMonth(1),
      Home: () => today,
    }
    const fn = map[e.key]
    if (fn) {
      e.preventDefault()
      move(fn())
    }
  }

  return (
    <div className="calendar select-none">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" className="icon-button-sm" onClick={() => setCursor(shiftMonth(-1))} aria-label="Previous month">
          <ChevronLeft size={15} strokeWidth={1.4} aria-hidden />
        </button>
        <p className="font-display text-lg italic" aria-live="polite">
          {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </p>
        <button type="button" className="icon-button-sm" onClick={() => setCursor(shiftMonth(1))} aria-label="Next month">
          <ChevronRight size={15} strokeWidth={1.4} aria-hidden />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center font-sans text-[10px] uppercase tracking-widest text-ink-muted" aria-hidden>
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div ref={gridRef} role="grid" aria-label="Calendar" className="grid grid-cols-7 gap-y-0.5" onKeyDown={onKeyDown}>
        {days.map((key, i) =>
          key ? (
            <button
              key={key}
              type="button"
              data-day={key}
              tabIndex={key === cursor ? 0 : -1}
              onClick={() => {
                setCursor(key)
                onSelect(key)
              }}
              aria-label={`${fromDayKey(key).toLocaleDateString(undefined, { dateStyle: 'full' })}${markedDays.has(key) ? ', has entries' : ''}`}
              aria-pressed={key === selected}
              className={`calendar-day ${key === today ? 'is-today' : ''} ${key === selected ? 'is-selected' : ''} ${markedDays.has(key) ? 'has-entry' : ''}`}
            >
              {fromDayKey(key).getDate()}
            </button>
          ) : (
            <span key={`pad-${i}`} />
          ),
        )}
      </div>
    </div>
  )
}

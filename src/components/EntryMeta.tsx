import { useId, useState, type KeyboardEvent } from 'react'
import { Star, X } from 'lucide-react'
import { MOODS, type JournalEntry } from '../db/types'
import { useJournal } from '../state/journalStore'
import { fromDayKey, isDayKey } from '../lib/dates'
import { newId } from '../lib/ids'

interface Props {
  entry: JournalEntry
  compact?: boolean
}

/** Date, mood, tags, favorite and small reminders — the quiet details kept in the left margin. */
export function EntryMeta({ entry, compact = false }: Props) {
  const updateEntry = useJournal((s) => s.updateEntry)
  const allTags = useJournal((s) => s.allTags)
  const [tagDraft, setTagDraft] = useState('')
  const [reminderDraft, setReminderDraft] = useState('')
  const listId = useId()
  const date = fromDayKey(entry.entryDate)
  const patch = (p: Parameters<typeof updateEntry>[1]) => updateEntry(entry.id, p)

  const commitTag = () => {
    const parts = tagDraft.split(',').map((t) => t.trim()).filter(Boolean)
    if (parts.length) patch({ tags: [...entry.tags, ...parts] })
    setTagDraft('')
  }

  const onTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commitTag()
    } else if (e.key === 'Backspace' && !tagDraft && entry.tags.length) {
      patch({ tags: entry.tags.slice(0, -1) })
    }
  }

  const addReminder = () => {
    const text = reminderDraft.trim()
    if (!text) return
    patch({ reminders: [...entry.reminders, { id: newId(), text, done: false }] })
    setReminderDraft('')
  }

  return (
    <div className={`entry-meta font-sans text-ink-muted ${compact ? 'flex flex-wrap items-center gap-x-5 gap-y-3' : 'flex flex-col gap-3.5'}`}>
      <div className={compact ? 'flex items-center gap-2' : ''}>
        <label className="block">
          <span className="sr-only">Entry date</span>
          {!compact && (
            <span className="block text-[11px] uppercase tracking-[0.22em]" aria-hidden>
              {date.toLocaleDateString(undefined, { weekday: 'long' })}
            </span>
          )}
          <input
            type="date"
            value={entry.entryDate}
            onChange={(e) => isDayKey(e.target.value) && patch({ entryDate: e.target.value })}
            className="meta-date"
          />
        </label>
      </div>

      <div role="group" aria-label="Mood" className="flex flex-wrap items-center gap-1">
        {MOODS.map((m) => {
          const on = entry.mood === m.id
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={on}
              title={m.label}
              aria-label={m.label}
              onClick={() => patch({ mood: on ? null : m.id })}
              className={`mood-chip ${on ? 'is-on' : ''}`}
            >
              <span aria-hidden>{m.glyph}</span>
            </button>
          )
        })}
        {entry.mood && !compact && (
          <span className="ml-1 font-serif text-sm italic text-ink">{MOODS.find((m) => m.id === entry.mood)?.label}</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {entry.tags.map((tag) => (
          <span key={tag} className="tag-chip">
            #{tag}
            <button
              type="button"
              onClick={() => patch({ tags: entry.tags.filter((t) => t !== tag) })}
              aria-label={`Remove tag ${tag}`}
              className="opacity-50 hover:opacity-100 focus-visible:opacity-100"
            >
              <X size={11} aria-hidden />
            </button>
          </span>
        ))}
        <input
          value={tagDraft}
          onChange={(e) => setTagDraft(e.target.value)}
          onKeyDown={onTagKey}
          onBlur={commitTag}
          list={listId}
          placeholder={entry.tags.length ? '' : 'add a tag'}
          aria-label="Add a tag"
          className="meta-input w-24"
        />
        <datalist id={listId}>
          {allTags.filter((t) => !entry.tags.includes(t)).map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </div>

      <button
        type="button"
        onClick={() => patch({ favorite: !entry.favorite })}
        aria-pressed={entry.favorite}
        className={`flex items-center gap-1.5 self-start text-[12px] tracking-wide ${entry.favorite ? 'text-gold' : 'opacity-70 hover:opacity-100'}`}
      >
        <Star size={14} strokeWidth={1.4} fill={entry.favorite ? 'currentColor' : 'none'} aria-hidden />
        {entry.favorite ? 'A favorite' : 'Mark as favorite'}
      </button>

      {!compact && (
        <div className="flex flex-col gap-1.5">
          <span className="meta-label">Reminders</span>
          <ul className="flex flex-col gap-1">
            {entry.reminders.map((r) => (
              <li key={r.id} className="group flex items-start gap-2 font-serif text-[15px] text-ink">
                <input
                  type="checkbox"
                  checked={r.done}
                  onChange={() =>
                    patch({ reminders: entry.reminders.map((x) => (x.id === r.id ? { ...x, done: !x.done } : x)) })
                  }
                  aria-label={`Done: ${r.text}`}
                  className="reminder-check mt-1.5"
                />
                <span className={`flex-1 ${r.done ? 'text-ink-muted line-through decoration-mauve' : ''}`}>{r.text}</span>
                <button
                  type="button"
                  onClick={() => patch({ reminders: entry.reminders.filter((x) => x.id !== r.id) })}
                  aria-label={`Remove reminder: ${r.text}`}
                  className="opacity-0 group-hover:opacity-60 focus-visible:opacity-100"
                >
                  <X size={12} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <input
            value={reminderDraft}
            onChange={(e) => setReminderDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addReminder())}
            onBlur={addReminder}
            placeholder="a small reminder…"
            aria-label="Add a reminder"
            className="meta-input font-serif text-[15px]"
          />
        </div>
      )}
    </div>
  )
}

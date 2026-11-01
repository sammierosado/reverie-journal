import { BookOpen, Eye, Feather as FeatherIcon, Keyboard, Moon, PanelLeftClose, PanelLeftOpen, Search, Settings, StickyNote, Sun } from 'lucide-react'
import { useJournal } from '../state/journalStore'
import { useUi } from '../state/uiStore'
import { drawPrompt, toggleFocusMode, toggleMargins, toggleTheme } from '../lib/commands'
import { useMediaQuery, WIDE_QUERY } from '../lib/useMediaQuery'
import { formatTime } from '../lib/dates'
import { Wordmark } from './Ornaments'

function SaveIndicator() {
  const save = useJournal((s) => s.save)
  const isDraft = useJournal((s) => s.draftId !== null && s.draftId === s.currentId)
  const flush = useJournal((s) => s.flush)

  let text: string
  if (save.status === 'error') text = 'Couldn’t save — retrying'
  else if (save.status === 'saving') text = 'Saving…'
  else if (save.status === 'unsaved') text = 'Writing…'
  else if (isDraft) text = 'A fresh page'
  else text = save.lastSavedAt ? `Saved · ${formatTime(save.lastSavedAt)}` : 'Saved'

  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2 font-sans text-[12px] tracking-wide text-ink-muted">
      <span className={`save-dot save-${save.status}`} aria-hidden />
      <span>{text}</span>
      {save.status === 'error' && (
        <button type="button" className="quiet-link" onClick={() => void flush()} title={save.error ?? undefined}>
          Retry now
        </button>
      )}
    </div>
  )
}

export function TopBar() {
  const toggle = useUi((s) => s.toggle)
  const showMargins = useJournal((s) => s.prefs.showMargins)
  const theme = useJournal((s) => s.prefs.theme)
  const wide = useMediaQuery(WIDE_QUERY)
  const isDark = theme === 'dark' || (theme === 'system' && typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark')

  return (
    <header className="chrome sticky top-0 z-30 flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <button type="button" className="icon-button" onClick={() => toggle('journal')} aria-label="Open journal (Alt+J)" title="Journal · Alt+J">
          <BookOpen size={18} strokeWidth={1.4} aria-hidden />
        </button>
        <Wordmark className="hidden text-ink sm:inline-flex" />
      </div>

      <SaveIndicator />

      <nav aria-label="Page tools" className="flex items-center gap-0.5">
        <button type="button" className="icon-button" onClick={() => toggle('palette')} aria-label="Search and commands (Ctrl+K)" title="Search · Ctrl+K">
          <Search size={17} strokeWidth={1.4} aria-hidden />
        </button>
        <button type="button" className="icon-button" onClick={drawPrompt} aria-label="Draw a writing prompt" title="A writing prompt">
          <FeatherIcon size={17} strokeWidth={1.4} aria-hidden />
        </button>
        {wide ? (
          <button
            type="button"
            className="icon-button"
            onClick={toggleMargins}
            aria-pressed={showMargins}
            aria-label="Show margins (Ctrl+\)"
            title={`${showMargins ? 'Hide' : 'Show'} margins · Ctrl+\\`}
          >
            {showMargins ? <PanelLeftClose size={17} strokeWidth={1.4} aria-hidden /> : <PanelLeftOpen size={17} strokeWidth={1.4} aria-hidden />}
          </button>
        ) : (
          <button type="button" className="icon-button" onClick={() => toggle('notes')} aria-label="Margin notes" title="Margin notes">
            <StickyNote size={17} strokeWidth={1.4} aria-hidden />
          </button>
        )}
        <button type="button" className="icon-button" onClick={toggleFocusMode} aria-label="Focus mode (Ctrl+.)" title="Focus mode · Ctrl+.">
          <Eye size={17} strokeWidth={1.4} aria-hidden />
        </button>
        <button type="button" className="icon-button" onClick={toggleTheme} aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'} title="Light / dark">
          {isDark ? <Sun size={17} strokeWidth={1.4} aria-hidden /> : <Moon size={17} strokeWidth={1.4} aria-hidden />}
        </button>
        <button type="button" className="icon-button hidden sm:inline-flex" onClick={() => toggle('shortcuts')} aria-label="Keyboard shortcuts (Ctrl+/)" title="Shortcuts · Ctrl+/">
          <Keyboard size={17} strokeWidth={1.4} aria-hidden />
        </button>
        <button type="button" className="icon-button" onClick={() => toggle('settings')} aria-label="Settings and backups (Ctrl+,)" title="Settings · Ctrl+,">
          <Settings size={17} strokeWidth={1.4} aria-hidden />
        </button>
      </nav>
    </header>
  )
}

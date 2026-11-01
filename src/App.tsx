import { useEffect } from 'react'
import { hasPendingSaves, selectCurrentEntry, useJournal } from './state/journalStore'
import { useUi } from './state/uiStore'
import { useGlobalShortcuts } from './lib/shortcuts'
import { TopBar } from './components/TopBar'
import { Page } from './components/Page'
import { JournalDrawer } from './components/JournalDrawer'
import { CommandPalette } from './components/CommandPalette'
import { SettingsDialog } from './components/SettingsDialog'
import { ShortcutsDialog } from './components/ShortcutsDialog'
import { ConfirmDialog } from './components/ConfirmDialog'
import { NotesPanel } from './marginalia/NotesPanel'
import { Crescent } from './components/Ornaments'
import { EyeOff } from 'lucide-react'
import { StyleDialog } from './components/StyleDialog'
import { applyAesthetic, rememberForFirstPaint, resolveMode } from './themes/applyAesthetic'

function useTheme() {
  const theme = useJournal((s) => s.prefs.theme)
  const aesthetic = useJournal((s) => s.prefs.aesthetic)
  const ready = useJournal((s) => s.ready)
  useEffect(() => {
    // Until preferences load, keep whatever index.html painted from the remembered style.
    if (!ready) return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => applyAesthetic(document.documentElement, aesthetic, resolveMode(theme, mql.matches))
    rememberForFirstPaint(theme, aesthetic)
    apply()
    mql.addEventListener('change', apply)
    return () => mql.removeEventListener('change', apply)
  }, [theme, aesthetic, ready])
}

/** Writes pending changes whenever the window might be going away. */
function useFlushOnExit() {
  useEffect(() => {
    const flush = () => void useJournal.getState().flush()
    const onVisibility = () => document.visibilityState === 'hidden' && flush()
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasPendingSaves()) return
      // A write started now still commits in Chromium-based browsers, so only
      // interrupt the writer when saving is actually failing.
      flush()
      if (useJournal.getState().save.status === 'error') e.preventDefault()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flush)
    window.addEventListener('blur', flush)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('blur', flush)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [])
}

/** Chrome recedes while typing and returns when the mouse moves. */
function useTypingQuiet() {
  useEffect(() => {
    const body = document.body
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('.ProseMirror') && !e.ctrlKey && !e.metaKey && !e.altKey) body.dataset.typing = 'true'
    }
    const onMove = () => delete body.dataset.typing
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousemove', onMove)
    }
  }, [])
}

function Toast() {
  const toast = useUi((s) => s.toast)
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center">
      {toast && <div className="toast animate-rise">{toast}</div>}
    </div>
  )
}

export default function App() {
  const ready = useJournal((s) => s.ready)
  const loadError = useJournal((s) => s.loadError)
  const entry = useJournal(selectCurrentEntry)
  const overlay = useUi((s) => s.overlay)
  const focusMode = useUi((s) => s.focusMode)

  useEffect(() => {
    void useJournal.getState().init()
  }, [])
  useTheme()
  useFlushOnExit()
  useTypingQuiet()
  useGlobalShortcuts()

  if (loadError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-desk p-6 text-ink">
        <div className="max-w-lg text-center">
          <Crescent size={32} className="mx-auto text-gold" />
          <h1 className="mt-4 font-display text-3xl italic">The journal could not be opened.</h1>
          <p className="mt-3 font-serif text-lg text-ink-muted">
            The browser refused access to local storage. Private windows and some privacy settings block it.
          </p>
          <pre className="mt-4 font-mono text-xs text-ink-muted">{loadError}</pre>
        </div>
      </main>
    )
  }

  return (
    <div className={`app min-h-screen bg-desk text-ink ${focusMode ? 'focus-mode' : ''}`}>
      <a href="#entry-title" className="skip-link">
        Skip to the page
      </a>
      {!focusMode && <TopBar />}
      {focusMode && (
        // The top bar is hidden in focus mode; this keeps a way out for touch screens and mice.
        <button
          type="button"
          className="focus-exit icon-button"
          onClick={() => useUi.getState().setFocusMode(false)}
          aria-label="Leave focus mode (Esc)"
          title="Leave focus mode · Esc"
        >
          <EyeOff size={17} strokeWidth={1.4} aria-hidden />
        </button>
      )}
      <main className="px-4 pt-6 pb-[45vh] sm:px-6 sm:pt-10">
        {ready && entry ? (
          <Page key={entry.id} entry={entry} />
        ) : (
          <div className="flex h-[60vh] items-center justify-center" aria-busy="true">
            <Crescent size={28} className="animate-breathe text-gold" />
            <span className="sr-only">Opening your journal…</span>
          </div>
        )}
      </main>

      {overlay === 'journal' && <JournalDrawer />}
      {overlay === 'palette' && <CommandPalette />}
      {overlay === 'settings' && <SettingsDialog />}
      {overlay === 'shortcuts' && <ShortcutsDialog />}
      {overlay === 'notes' && <NotesPanel />}
      {overlay === 'style' && <StyleDialog />}
      <ConfirmDialog />
      <Toast />
    </div>
  )
}

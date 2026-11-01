import { useEffect } from 'react'
import { useUi } from '../state/uiStore'
import { useJournal } from '../state/journalStore'
import {
  addNoteAtCursor,
  adjustFontSize,
  newEntry,
  stepEntry,
  toggleFocusMode,
  toggleMargins,
} from './commands'

export interface ShortcutDef {
  keys: string
  label: string
}

/**
 * Chosen to avoid keys browsers reserve and won't release (Ctrl+N, Ctrl+T, Ctrl+W, Ctrl+Shift+N…).
 * Everything else is reachable from the command palette, so nothing needs the mouse.
 */
export const SHORTCUTS: readonly { group: string; items: ShortcutDef[] }[] = [
  {
    group: 'Journal',
    items: [
      { keys: 'Ctrl K', label: 'Search & commands' },
      { keys: 'Alt N', label: 'New entry' },
      { keys: 'Alt J', label: 'Open journal & calendar' },
      { keys: 'Alt PgUp / Alt PgDn', label: 'Previous / next entry' },
      { keys: 'Ctrl S', label: 'Save now' },
    ],
  },
  {
    group: 'Margins',
    items: [
      { keys: 'Ctrl [', label: 'Note in the left margin' },
      { keys: 'Ctrl ]', label: 'Note in the right margin' },
      { keys: 'Esc  or  Ctrl Enter', label: 'Back to the page from a note' },
      { keys: 'Ctrl \\', label: 'Show / hide margins' },
    ],
  },
  {
    group: 'Writing',
    items: [
      { keys: 'Ctrl .', label: 'Focus mode' },
      { keys: 'Ctrl = / Ctrl -', label: 'Larger / smaller text' },
      { keys: 'Ctrl B · Ctrl I · Ctrl U', label: 'Bold · italic · underline' },
      { keys: 'Ctrl Alt 1 / 2', label: 'Heading' },
      { keys: 'Ctrl Shift B', label: 'Quotation block' },
      { keys: '↑ at the start', label: 'Move to the title' },
    ],
  },
  {
    group: 'Elsewhere',
    items: [
      { keys: 'Ctrl ,', label: 'Settings & backups' },
      { keys: 'Ctrl /', label: 'This list' },
      { keys: 'Esc', label: 'Close a panel' },
    ],
  },
]

export function useGlobalShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const ui = useUi.getState()
      const mod = e.ctrlKey || e.metaKey
      const key = e.key

      const run = (fn: () => void) => {
        e.preventDefault()
        e.stopPropagation()
        fn()
      }

      if (mod && !e.altKey && key.toLowerCase() === 'k') return run(() => ui.toggle('palette'))
      if (mod && !e.altKey && key.toLowerCase() === 's') return run(() => void useJournal.getState().flush())
      if (mod && key === ',') return run(() => ui.toggle('settings'))
      if (mod && key === '/') return run(() => ui.toggle('shortcuts'))
      if (ui.confirm) return // the confirmation dialog owns the keyboard
      if (key === 'Escape' && (ui.overlay || ui.focusMode)) {
        // Dialogs handle their own Escape; this closes drawers and leaves focus mode.
        if (ui.overlay) return run(() => ui.close())
        return run(() => ui.setFocusMode(false))
      }

      // The rest act on the page, so they stay quiet while a dialog is open.
      if (ui.overlay === 'palette' || ui.overlay === 'settings' || ui.overlay === 'shortcuts' || ui.confirm) return

      if (e.altKey && !mod && key.toLowerCase() === 'n') return run(() => void newEntry())
      if (e.altKey && !mod && key.toLowerCase() === 'j') return run(() => ui.toggle('journal'))
      if (e.altKey && key === 'PageUp') return run(() => void stepEntry(-1))
      if (e.altKey && key === 'PageDown') return run(() => void stepEntry(1))
      // `code` keeps the bracket shortcuts on the same physical keys on non-US layouts.
      if (mod && !e.altKey && (key === '[' || e.code === 'BracketLeft')) return run(() => addNoteAtCursor('left'))
      if (mod && !e.altKey && (key === ']' || e.code === 'BracketRight')) return run(() => addNoteAtCursor('right'))
      if (mod && key === '\\') return run(toggleMargins)
      if (mod && key === '.') return run(toggleFocusMode)
      if (mod && (key === '=' || key === '+')) return run(() => adjustFontSize(1))
      if (mod && key === '-') return run(() => adjustFontSize(-1))
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [])
}

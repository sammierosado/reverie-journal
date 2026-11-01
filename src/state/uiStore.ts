import { create } from 'zustand'

export type Overlay = 'journal' | 'palette' | 'settings' | 'shortcuts' | 'notes' | 'style' | null

export interface ConfirmRequest {
  title: string
  message: string
  confirmLabel: string
  /** Destructive confirmations get a quieter, warning-toned button. */
  danger?: boolean
  resolve: (ok: boolean) => void
}

interface UiState {
  overlay: Overlay
  focusMode: boolean
  confirm: ConfirmRequest | null
  toast: string | null
  /** A note that should take keyboard focus as soon as it renders. */
  focusNoteId: string | null
  /** The paragraph whose margin notes are hovered or focused. */
  activeParagraphId: string | null
  open: (overlay: Overlay) => void
  toggle: (overlay: Exclude<Overlay, null>) => void
  close: () => void
  setFocusMode: (on: boolean) => void
  showToast: (message: string) => void
  setFocusNote: (id: string | null) => void
  setActiveParagraph: (id: string | null) => void
}

let toastTimer: ReturnType<typeof setTimeout> | undefined

export const useUi = create<UiState>()((set) => ({
  overlay: null,
  focusMode: false,
  confirm: null,
  toast: null,
  focusNoteId: null,
  activeParagraphId: null,
  open: (overlay) => set({ overlay }),
  toggle: (overlay) => set((s) => ({ overlay: s.overlay === overlay ? null : overlay })),
  close: () => set({ overlay: null }),
  setFocusMode: (focusMode) => set({ focusMode }),
  showToast: (toast) => {
    clearTimeout(toastTimer)
    set({ toast })
    toastTimer = setTimeout(() => set({ toast: null }), 3200)
  },
  setFocusNote: (focusNoteId) => set({ focusNoteId }),
  setActiveParagraph: (activeParagraphId) => set({ activeParagraphId }),
}))

/** Promise-based confirmation, rendered by <ConfirmDialog />. */
export function confirmAction(request: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => {
    useUi.setState({
      confirm: {
        ...request,
        resolve: (ok) => {
          useUi.setState({ confirm: null })
          resolve(ok)
        },
      },
    })
  })
}

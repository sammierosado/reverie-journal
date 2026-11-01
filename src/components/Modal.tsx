import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  /** 'dialog' is centered; 'drawer-left' / 'drawer-right' slide from the edges. */
  variant?: 'dialog' | 'drawer-left' | 'drawer-right'
  width?: string
  /** Hide the visible heading (it stays available to screen readers). */
  hideTitle?: boolean
  initialFocus?: string
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

/** Accessible overlay: traps Tab, restores focus on close, closes on backdrop click. */
export function Modal({ title, onClose, children, variant = 'dialog', width = '32rem', hideTitle, initialFocus }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const target = (initialFocus && panel?.querySelector<HTMLElement>(initialFocus)) || panel?.querySelector<HTMLElement>(FOCUSABLE)
    target?.focus()
    return () => {
      // Return to where the writer was, unless something else already took focus.
      if (previouslyFocused?.isConnected && (document.activeElement === document.body || panel?.contains(document.activeElement)))
        previouslyFocused.focus({ preventScroll: true })
    }
  }, [initialFocus])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !panelRef.current) return
    const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
    const first = items[0]
    const last = items[items.length - 1]
    if (!first || !last) return
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const placement =
    variant === 'dialog'
      ? 'items-start justify-center pt-[12vh] px-4'
      : variant === 'drawer-left'
        ? 'items-stretch justify-start'
        : 'items-stretch justify-end'

  const panelShape =
    variant === 'dialog'
      ? 'rounded-sm max-h-[76vh] w-full animate-rise'
      : `h-full w-full ${variant === 'drawer-left' ? 'animate-slide-left border-r' : 'animate-slide-right border-l'}`

  return (
    <div className={`fixed inset-0 z-40 flex ${placement}`} onKeyDown={onKeyDown}>
      <div className="absolute inset-0 bg-veil animate-fade" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ maxWidth: width }}
        className={`relative flex flex-col overflow-hidden border-line bg-surface text-ink shadow-veil ${panelShape} ${variant === 'dialog' ? 'border' : ''}`}
      >
        <header className={`flex items-center justify-between px-6 pt-5 pb-3 ${hideTitle ? 'sr-only' : ''}`}>
          <h2 className="font-display text-2xl italic">{title}</h2>
          <button type="button" onClick={onClose} className="icon-button" aria-label="Close">
            <X size={18} strokeWidth={1.4} aria-hidden />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

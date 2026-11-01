import { useEffect, useRef } from 'react'
import { useUi } from '../state/uiStore'

export function ConfirmDialog() {
  const request = useUi((s) => s.confirm)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!request) return
    const previous = document.activeElement as HTMLElement | null
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        request.resolve(false)
      }
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => {
      window.removeEventListener('keydown', onKey, { capture: true })
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [request])

  if (!request) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-veil animate-fade" onClick={() => request.resolve(false)} aria-hidden />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="relative w-full max-w-md animate-rise border border-line bg-surface p-7 text-ink shadow-veil"
      >
        <h2 id="confirm-title" className="font-display text-2xl italic">
          {request.title}
        </h2>
        <p id="confirm-message" className="mt-3 font-serif text-[17px] leading-relaxed text-ink-muted">
          {request.message}
        </p>
        <div className="mt-7 flex justify-end gap-3">
          <button ref={cancelRef} type="button" className="btn" onClick={() => request.resolve(false)}>
            Cancel
          </button>
          <button
            type="button"
            className={request.danger ? 'btn btn-danger' : 'btn btn-primary'}
            onClick={() => request.resolve(true)}
          >
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

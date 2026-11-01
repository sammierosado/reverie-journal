import { useEffect, useLayoutEffect, type RefObject } from 'react'

function fit(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

/**
 * Keeps a textarea exactly as tall as its text. Besides `deps` (the text, the style…),
 * it refits when the window resizes or a web font finishes loading, since a new font
 * can rewrap the same words onto more lines.
 */
export function useAutoSize(ref: RefObject<HTMLTextAreaElement | null>, deps: unknown[]): void {
  // Callers pass exactly what should trigger a refit.
  useLayoutEffect(() => fit(ref.current), deps)

  useEffect(() => {
    const refit = () => fit(ref.current)
    window.addEventListener('resize', refit)
    document.fonts?.addEventListener('loadingdone', refit)
    void document.fonts?.ready.then(refit)
    return () => {
      window.removeEventListener('resize', refit)
      document.fonts?.removeEventListener('loadingdone', refit)
    }
  }, [ref])
}

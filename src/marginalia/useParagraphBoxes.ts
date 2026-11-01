import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import type { ParagraphBox } from './layout'

function sameBoxes(a: ReadonlyMap<string, ParagraphBox>, b: ReadonlyMap<string, ParagraphBox>): boolean {
  if (a.size !== b.size) return false
  for (const [id, box] of a) {
    const other = b.get(id)
    if (!other || other.top !== box.top || other.height !== box.height) return false
  }
  return true
}

/**
 * Measures every anchored paragraph (`[data-pid]`) relative to `containerRef`.
 * Positions come from the live DOM, but identity comes from the stable `pid`,
 * so edits, reflow and font changes only move notes — they never re-link them.
 */
export function useParagraphBoxes(
  containerRef: RefObject<HTMLElement | null>,
  /** Anything that may move paragraphs (document content, font settings…). */
  trigger: unknown,
): ReadonlyMap<string, ParagraphBox> {
  const [boxes, setBoxes] = useState<ReadonlyMap<string, ParagraphBox>>(() => new Map())
  const frame = useRef(0)
  const fallback = useRef<ReturnType<typeof setTimeout>>(undefined)

  const measure = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const origin = container.getBoundingClientRect().top
    const next = new Map<string, ParagraphBox>()
    container.querySelectorAll<HTMLElement>('.ProseMirror [data-pid]').forEach((el) => {
      const rect = el.getBoundingClientRect()
      next.set(el.dataset.pid!, { top: Math.round(rect.top - origin), height: Math.round(rect.height) })
    })
    setBoxes((prev) => (sameBoxes(prev, next) ? prev : next))
  }, [containerRef])

  // rAF batches measurements with paint; the timeout covers windows that are not painting
  // (background tabs, minimized windows), where rAF never fires.
  const schedule = useCallback(() => {
    cancelAnimationFrame(frame.current)
    clearTimeout(fallback.current)
    frame.current = requestAnimationFrame(measure)
    fallback.current = setTimeout(measure, 120)
  }, [measure])

  useLayoutEffect(() => {
    measure()
    schedule()
  }, [measure, schedule, trigger])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(schedule)
    observer.observe(container)
    window.addEventListener('resize', schedule)
    void document.fonts?.ready.then(schedule)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', schedule)
      cancelAnimationFrame(frame.current)
      clearTimeout(fallback.current)
    }
  }, [containerRef, schedule])

  return boxes
}

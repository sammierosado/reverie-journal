import type { MarginAnnotation } from '../db/types'

export interface ParagraphBox {
  top: number
  height: number
}

export interface PlacedNote {
  id: string
  /** Where the note would like to sit: level with its paragraph. */
  anchorTop: number
  /** Where it actually sits after avoiding the notes above it. */
  top: number
}

/**
 * Stacks notes in one margin column so they never overlap.
 * Each note starts level with its paragraph and is pushed down only as far as needed.
 * Notes on the same paragraph keep their creation order.
 */
export function layoutNotes(
  notes: Pick<MarginAnnotation, 'id' | 'paragraphId' | 'createdAt'>[],
  boxes: ReadonlyMap<string, ParagraphBox>,
  heights: Readonly<Record<string, number>>,
  gap = 12,
  defaultHeight = 64,
): PlacedNote[] {
  const anchored = notes
    .filter((n) => boxes.has(n.paragraphId))
    .map((n) => ({ ...n, anchorTop: boxes.get(n.paragraphId)!.top }))
    .sort((a, b) => a.anchorTop - b.anchorTop || a.createdAt - b.createdAt)

  let cursor = Number.NEGATIVE_INFINITY
  return anchored.map((n) => {
    const top = Math.max(n.anchorTop, cursor)
    cursor = top + (heights[n.id] ?? defaultHeight) + gap
    return { id: n.id, anchorTop: n.anchorTop, top }
  })
}

/** The paragraph whose vertical extent contains `y` (or the nearest one above it). */
export function paragraphAtY(boxes: ReadonlyMap<string, ParagraphBox>, y: number): string | null {
  let best: string | null = null
  let bestTop = Number.NEGATIVE_INFINITY
  for (const [id, box] of boxes) {
    if (box.top <= y && box.top > bestTop && y <= box.top + box.height + 24) {
      best = id
      bestTop = box.top
    }
  }
  return best
}

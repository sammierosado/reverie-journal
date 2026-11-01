import { describe, expect, it } from 'vitest'
import { layoutNotes, paragraphAtY } from '../../src/marginalia/layout'

const boxes = new Map([
  ['p1', { top: 0, height: 40 }],
  ['p2', { top: 50, height: 40 }],
  ['p3', { top: 400, height: 40 }],
])

describe('margin note layout', () => {
  it('places each note level with its paragraph when there is room', () => {
    const placed = layoutNotes(
      [
        { id: 'a', paragraphId: 'p1', createdAt: 1 },
        { id: 'b', paragraphId: 'p3', createdAt: 2 },
      ],
      boxes,
      { a: 30, b: 30 },
    )
    expect(placed).toEqual([
      { id: 'a', anchorTop: 0, top: 0 },
      { id: 'b', anchorTop: 400, top: 400 },
    ])
  })

  it('pushes overlapping notes down without reordering them', () => {
    const placed = layoutNotes(
      [
        { id: 'late', paragraphId: 'p1', createdAt: 5 },
        { id: 'early', paragraphId: 'p1', createdAt: 1 },
        { id: 'next', paragraphId: 'p2', createdAt: 2 },
      ],
      boxes,
      { early: 100, late: 100, next: 20 },
      10,
    )
    expect(placed.map((p) => [p.id, p.top])).toEqual([
      ['early', 0],
      ['late', 110],
      ['next', 220],
    ])
    // The connector still knows where the paragraph is.
    expect(placed[2]!.anchorTop).toBe(50)
  })

  it('leaves out notes whose paragraph is not on the page', () => {
    expect(layoutNotes([{ id: 'x', paragraphId: 'gone', createdAt: 1 }], boxes, {})).toEqual([])
  })

  it('finds the paragraph beside a pointer position', () => {
    expect(paragraphAtY(boxes, 10)).toBe('p1')
    expect(paragraphAtY(boxes, 60)).toBe('p2')
    expect(paragraphAtY(boxes, 300)).toBeNull()
  })
})

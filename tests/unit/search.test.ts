import { describe, expect, it } from 'vitest'
import { highlightParts, searchEntries } from '../../src/lib/search'
import { applyEntryPatch, makeAnnotation, makeEntry } from '../../src/db/repository'
import { doc } from '../helpers'

const a = applyEntryPatch(makeEntry('2026-10-01'), { title: 'Café at dusk', content: doc('We talked about the moon.'), tags: ['friends'] })
const b = applyEntryPatch(makeEntry('2026-10-02'), { title: 'River walk', content: doc('The moon was low and orange over the water.') })

describe('search', () => {
  it('matches title and content, ignoring case and accents', () => {
    expect(searchEntries([a, b], [], 'cafe').map((h) => h.entry.id)).toEqual([a.id])
    expect(searchEntries([a, b], [], 'MOON')).toHaveLength(2)
  })

  it('requires every term and ranks title matches first', () => {
    const hits = searchEntries([a, b], [], 'river moon')
    expect(hits.map((h) => h.entry.id)).toEqual([b.id])
    expect(searchEntries([a, b], [], 'walk')[0]!.matchedIn).toBe('title')
  })

  it('finds entries by tag and by margin note', () => {
    expect(searchEntries([a, b], [], 'friends')[0]!.entry.id).toBe(a.id)
    const note = { ...makeAnnotation(b.id, 'p', 'right'), text: 'Heron sighting' }
    const hit = searchEntries([a, b], [note], 'heron')[0]!
    expect(hit.entry.id).toBe(b.id)
    expect(hit.matchedIn).toBe('note')
  })

  it('returns nothing for an empty query', () => {
    expect(searchEntries([a, b], [], '   ')).toEqual([])
  })

  it('highlights matched fragments', () => {
    expect(highlightParts('The Moon rose', ['moon'])).toEqual([
      { text: 'The ', match: false },
      { text: 'Moon', match: true },
      { text: ' rose', match: false },
    ])
  })
})

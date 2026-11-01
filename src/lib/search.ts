import type { JournalEntry, MarginAnnotation } from '../db/types'

export interface SearchHit {
  entry: JournalEntry
  score: number
  /** A short passage around the first match. */
  snippet: string
  /** Where the hit was found, for the result label. */
  matchedIn: 'title' | 'text' | 'tag' | 'note'
}

/** Lowercase and strip accents so "cafe" finds "café". */
export function fold(text: string): string {
  return text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function queryTerms(query: string): string[] {
  return fold(query).split(/\s+/).filter(Boolean)
}

function snippetAround(text: string, term: string, radius = 70): string {
  const folded = fold(text)
  const at = folded.indexOf(term)
  if (at < 0) return text.slice(0, radius * 2).replace(/\s+/g, ' ').trim()
  const start = Math.max(0, at - radius)
  const end = Math.min(text.length, at + term.length + radius)
  return `${start > 0 ? '…' : ''}${text.slice(start, end).replace(/\s+/g, ' ').trim()}${end < text.length ? '…' : ''}`
}

/**
 * Every term must appear somewhere in the entry (title, text, tags or margin notes).
 * Title matches rank highest, then tags, then body text, then notes; newer entries break ties.
 */
export function searchEntries(
  entries: JournalEntry[],
  annotations: MarginAnnotation[],
  query: string,
  limit = 30,
): SearchHit[] {
  const terms = queryTerms(query)
  if (!terms.length) return []
  const notesByEntry = new Map<string, string>()
  for (const a of annotations) notesByEntry.set(a.entryId, `${notesByEntry.get(a.entryId) ?? ''}\n${a.text}`)

  const hits: SearchHit[] = []
  for (const entry of entries) {
    const title = fold(entry.title)
    const text = fold(entry.plainText)
    const tags = entry.tags.map(fold).join(' ')
    const notesRaw = notesByEntry.get(entry.id) ?? ''
    const notes = fold(notesRaw)

    let score = 0
    let matchedIn: SearchHit['matchedIn'] = 'text'
    let ok = true
    for (const term of terms) {
      const inTitle = title.includes(term)
      const inTags = tags.includes(term)
      const inText = text.includes(term)
      const inNotes = notes.includes(term)
      if (!inTitle && !inTags && !inText && !inNotes) {
        ok = false
        break
      }
      score += (inTitle ? 8 : 0) + (inTags ? 5 : 0) + (inText ? 3 : 0) + (inNotes ? 2 : 0)
    }
    if (!ok) continue

    const first = terms[0]!
    let snippet: string
    if (text.includes(first)) snippet = snippetAround(entry.plainText, first)
    else if (notes.includes(first)) {
      matchedIn = 'note'
      snippet = snippetAround(notesRaw, first)
    } else {
      matchedIn = title.includes(first) ? 'title' : 'tag'
      snippet = snippetAround(entry.plainText, first)
    }
    if (title.includes(first)) matchedIn = 'title'
    hits.push({ entry, score, snippet, matchedIn })
  }
  return hits.sort((a, b) => b.score - a.score || b.entry.updatedAt - a.entry.updatedAt).slice(0, limit)
}

/** Splits text into plain and matched parts for highlighting. */
export function highlightParts(text: string, terms: string[]): { text: string; match: boolean }[] {
  if (!terms.length) return [{ text, match: false }]
  const folded = fold(text)
  const marks = new Array<boolean>(text.length).fill(false)
  for (const term of terms) {
    let i = folded.indexOf(term)
    while (i >= 0) {
      for (let k = i; k < i + term.length; k++) marks[k] = true
      i = folded.indexOf(term, i + term.length)
    }
  }
  const parts: { text: string; match: boolean }[] = []
  for (let i = 0; i < text.length; i++) {
    const last = parts[parts.length - 1]
    if (last && last.match === marks[i]) last.text += text[i]
    else parts.push({ text: text[i]!, match: marks[i]! })
  }
  return parts
}

import { describe, expect, it } from 'vitest'
import { entryToMarkdown, journalToMarkdown, slugify } from '../../src/db/markdown'
import { applyEntryPatch, makeAnnotation, makeEntry } from '../../src/db/repository'

const text = (t: string, marks?: { type: string }[]) => ({ type: 'text', text: t, ...(marks ? { marks } : {}) })

const content = {
  type: 'doc',
  content: [
    { type: 'paragraph', attrs: { pid: 'p1' }, content: [text('I read '), text('slowly', [{ type: 'italic' }]), text('.')] },
    { type: 'heading', attrs: { level: 1, pid: 'h1' }, content: [text('Later')] },
    {
      type: 'bulletList',
      content: [{ type: 'listItem', content: [{ type: 'paragraph', attrs: { pid: 'p2' }, content: [text('tea', [{ type: 'bold' }])] }] }],
    },
    { type: 'blockquote', content: [{ type: 'paragraph', attrs: { pid: 'p3' }, content: [text('a quote')] }] },
  ],
}

describe('markdown export', () => {
  const entry = applyEntryPatch(makeEntry('2026-11-01'), { title: 'Evening', content, mood: 'tender', tags: ['books'] })

  it('renders title, metadata, formatting and structure', () => {
    const md = entryToMarkdown(entry, [])
    expect(md).toContain('# Evening')
    expect(md).toContain('Mood: Tender')
    expect(md).toContain('#books')
    expect(md).toContain('I read *slowly*.')
    expect(md).toContain('## Later')
    expect(md).toContain('- **tea**')
    expect(md).toContain('> a quote')
  })

  it('turns margin notes into footnotes on their paragraphs', () => {
    const left = { ...makeAnnotation(entry.id, 'p1', 'left'), text: 'Which book?', createdAt: 1 }
    const right = { ...makeAnnotation(entry.id, 'p2', 'right', 'quote'), text: 'Earl Grey', createdAt: 2 }
    const md = entryToMarkdown(entry, [left, right])
    expect(md).toContain('I read *slowly*.[^1]')
    expect(md).toContain('- **tea**[^2]')
    expect(md).toContain('[^1]: *Left margin · note:* Which book?')
    expect(md).toContain('[^2]: *Right margin · quote:* Earl Grey')
  })

  it('lists notes whose paragraph is gone instead of dropping them', () => {
    const orphan = { ...makeAnnotation(entry.id, 'deleted', 'left'), text: 'Still here' }
    expect(entryToMarkdown(entry, [orphan])).toContain('## Detached margin notes')
  })

  it('escapes markdown characters in plain text', () => {
    const e = applyEntryPatch(makeEntry(), {
      content: { type: 'doc', content: [{ type: 'paragraph', attrs: { pid: 'x' }, content: [text('*not bold* #1')] }] },
    })
    expect(entryToMarkdown(e, [])).toContain(String.raw`\*not bold\* \#1`)
  })

  it('exports the journal in chronological order', () => {
    const a = applyEntryPatch(makeEntry('2026-10-01'), { title: 'First' })
    const b = applyEntryPatch(makeEntry('2026-11-01'), { title: 'Second' })
    const md = journalToMarkdown([b, a], [])
    expect(md.indexOf('# First')).toBeLessThan(md.indexOf('# Second'))
  })

  it('makes safe file names', () => {
    expect(slugify('Ça va? Moon & Stars!')).toBe('ca-va-moon-stars')
    expect(slugify('')).toBe('untitled')
  })
})

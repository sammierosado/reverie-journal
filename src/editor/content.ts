import type { JSONContent } from '@tiptap/core'
import type { JournalParagraph } from '../db/types'

export const ANCHORED_BLOCK_TYPES = ['paragraph', 'heading'] as const

export function emptyDoc(): JSONContent {
  return { type: 'doc', content: [{ type: 'paragraph' }] }
}

function inlineText(node: JSONContent): string {
  if (node.type === 'text') return node.text ?? ''
  if (node.type === 'hardBreak') return '\n'
  return (node.content ?? []).map(inlineText).join('')
}

/** Every anchorable block, in document order, including those nested in lists and quotes. */
export function extractParagraphs(doc: JSONContent): JournalParagraph[] {
  const out: JournalParagraph[] = []
  const walk = (node: JSONContent) => {
    if (node.type === 'paragraph' || node.type === 'heading') {
      const pid = node.attrs?.pid
      if (typeof pid === 'string') out.push({ id: pid, type: node.type, text: inlineText(node) })
      return
    }
    node.content?.forEach(walk)
  }
  walk(doc)
  return out
}

/** Plain text with blank lines between blocks; used for search, excerpts and word counts. */
export function docToPlainText(doc: JSONContent): string {
  const blocks: string[] = []
  const walk = (node: JSONContent) => {
    if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'codeBlock') {
      blocks.push(inlineText(node))
      return
    }
    node.content?.forEach(walk)
  }
  walk(doc)
  return blocks.join('\n\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function countWords(text: string): number {
  const matches = text.match(/[\p{L}\p{N}’']+/gu)
  return matches ? matches.length : 0
}

export function excerpt(text: string, length = 140): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > length ? `${flat.slice(0, length).trimEnd()}…` : flat
}

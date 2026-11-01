import type { JSONContent } from '@tiptap/core'
import { moodById, type JournalEntry, type MarginAnnotation } from './types'
import { formatLongDate } from '../lib/dates'

type Mark = NonNullable<JSONContent['marks']>[number]

function escapeText(text: string): string {
  return text.replace(/([\\`*_[\]#<>])/g, '\\$1')
}

function wrapMark(text: string, mark: Mark): string {
  switch (mark.type) {
    case 'bold':
      return `**${text}**`
    case 'italic':
      return `*${text}*`
    case 'strike':
      return `~~${text}~~`
    case 'code':
      return `\`${text}\``
    case 'underline':
      return `<u>${text}</u>`
    case 'link':
      return `[${text}](${String(mark.attrs?.href ?? '')})`
    default:
      return text
  }
}

function inline(nodes: JSONContent[] | undefined): string {
  return (nodes ?? [])
    .map((n) => {
      if (n.type === 'hardBreak') return '  \n'
      if (n.type !== 'text') return inline(n.content)
      const isCode = n.marks?.some((m) => m.type === 'code')
      const base = isCode ? (n.text ?? '') : escapeText(n.text ?? '')
      return (n.marks ?? []).reduce(wrapMark, base)
    })
    .join('')
}

interface Ctx {
  /** pid -> footnote numbers for notes attached to that paragraph */
  footnotes: Map<string, number[]>
}

function footnoteRefs(node: JSONContent, ctx: Ctx): string {
  const pid = node.attrs?.pid
  const nums = typeof pid === 'string' ? ctx.footnotes.get(pid) : undefined
  return nums ? nums.map((n) => `[^${n}]`).join('') : ''
}

function block(node: JSONContent, ctx: Ctx, indent = ''): string {
  switch (node.type) {
    case 'paragraph':
      return indent + inline(node.content) + footnoteRefs(node, ctx)
    case 'heading': {
      // The entry title is the document's H1, so body headings start one level down.
      const level = Math.min(6, Number(node.attrs?.level ?? 1) + 1)
      return `${'#'.repeat(level)} ${inline(node.content)}${footnoteRefs(node, ctx)}`
    }
    case 'blockquote':
      return (node.content ?? [])
        .map((c) => block(c, ctx))
        .join('\n\n')
        .split('\n')
        .map((l) => (l ? `> ${l}` : '>'))
        .join('\n')
    case 'bulletList':
    case 'orderedList':
      return (node.content ?? [])
        .map((item, i) => {
          const marker = node.type === 'orderedList' ? `${i + 1}. ` : '- '
          const inner = (item.content ?? []).map((c) => block(c, ctx)).join('\n\n')
          const pad = ' '.repeat(marker.length)
          return indent + marker + inner.split('\n').join(`\n${indent}${pad}`)
        })
        .join('\n')
    case 'codeBlock':
      return '```\n' + (node.content ?? []).map((t) => t.text ?? '').join('') + '\n```'
    case 'horizontalRule':
      return '---'
    default:
      return inline(node.content)
  }
}

const SIDE_LABEL = { left: 'Left margin', right: 'Right margin' } as const

export function entryToMarkdown(entry: JournalEntry, annotations: MarginAnnotation[]): string {
  const docPids = new Set<string>()
  const collect = (n: JSONContent) => {
    if (typeof n.attrs?.pid === 'string') docPids.add(n.attrs.pid)
    n.content?.forEach(collect)
  }
  collect(entry.content)

  const anchored = annotations.filter((a) => a.text.trim() && docPids.has(a.paragraphId))
  const detached = annotations.filter((a) => a.text.trim() && !docPids.has(a.paragraphId))
  const ctx: Ctx = { footnotes: new Map() }
  anchored.forEach((a, i) => {
    const list = ctx.footnotes.get(a.paragraphId) ?? []
    list.push(i + 1)
    ctx.footnotes.set(a.paragraphId, list)
  })

  const lines: string[] = [`# ${entry.title.trim() || 'Untitled'}`, '']
  const meta = [`*${formatLongDate(entry.entryDate)}*`]
  const mood = moodById(entry.mood)
  if (mood) meta.push(`Mood: ${mood.label}`)
  if (entry.tags.length) meta.push(entry.tags.map((t) => `#${t}`).join(' '))
  if (entry.favorite) meta.push('★ Favorite')
  lines.push(meta.join(' · '), '')
  if (entry.prompt) lines.push(`> *Prompt:* ${entry.prompt}`, '')

  const body = (entry.content.content ?? [])
    .map((n) => block(n, ctx))
    .filter((s) => s.trim() !== '')
    .join('\n\n')
  if (body) lines.push(body, '')

  if (entry.reminders.length) {
    lines.push('## Reminders', '')
    entry.reminders.forEach((r) => lines.push(`- [${r.done ? 'x' : ' '}] ${escapeText(r.text)}`))
    lines.push('')
  }

  if (anchored.length) {
    anchored.forEach((a, i) => {
      const text = a.text.trim().replace(/\n/g, '\n    ')
      lines.push(`[^${i + 1}]: *${SIDE_LABEL[a.side]} · ${a.kind}:* ${text}`)
    })
    lines.push('')
  }
  if (detached.length) {
    lines.push('## Detached margin notes', '')
    detached.forEach((a) => lines.push(`- *${SIDE_LABEL[a.side]} · ${a.kind}:* ${a.text.trim()}`))
    lines.push('')
  }
  return lines.join('\n').trimEnd() + '\n'
}

export function journalToMarkdown(entries: JournalEntry[], annotations: MarginAnnotation[]): string {
  const byEntry = new Map<string, MarginAnnotation[]>()
  for (const a of annotations) {
    const list = byEntry.get(a.entryId) ?? []
    list.push(a)
    byEntry.set(a.entryId, list)
  }
  const sorted = [...entries].sort((a, b) => a.entryDate.localeCompare(b.entryDate) || a.createdAt - b.createdAt)
  return sorted.map((e) => entryToMarkdown(e, byEntry.get(e.id) ?? [])).join('\n---\n\n')
}

export function slugify(text: string): string {
  return (
    text
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'untitled'
  )
}

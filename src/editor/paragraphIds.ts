import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state'
import type { Node as PMNode } from '@tiptap/pm/model'
import { ANCHORED_BLOCK_TYPES } from './content'
import { newId } from '../lib/ids'

export const paragraphIdsKey = new PluginKey('paragraphIds')
/** Set on a transaction to force id assignment, e.g. right after the editor loads content. */
export const ENSURE_IDS_META = 'reverie:ensureIds'

const anchored = new Set<string>(ANCHORED_BLOCK_TYPES)

/**
 * Returns a transaction giving every paragraph/heading a unique `pid`, or null if nothing changed.
 *
 * Splitting a block copies its attributes into both halves, so duplicates are expected.
 * The id stays with the half holding more text (the "original"), and the other half
 * gets a fresh one — so pressing Enter at the very start of an annotated paragraph
 * keeps its notes beside the words, not beside the new empty line.
 */
export function assignParagraphIds(state: EditorState): Transaction | null {
  const groups = new Map<string, { pos: number; node: PMNode }[]>()
  const missing: { pos: number; node: PMNode }[] = []

  state.doc.descendants((node, pos) => {
    if (!anchored.has(node.type.name)) return true
    const pid = node.attrs.pid as string | null
    if (!pid) missing.push({ pos, node })
    else groups.set(pid, [...(groups.get(pid) ?? []), { pos, node }])
    return false
  })

  const reassign = [...missing]
  for (const group of groups.values()) {
    if (group.length < 2) continue
    let keeper = group[0]!
    for (const item of group) if (item.node.textContent.length > keeper.node.textContent.length) keeper = item
    reassign.push(...group.filter((g) => g !== keeper))
  }
  if (reassign.length === 0) return null

  const tr = state.tr
  for (const { pos, node } of reassign) tr.setNodeMarkup(pos, undefined, { ...node.attrs, pid: newId() })
  tr.setMeta('addToHistory', false)
  return tr
}

export const ParagraphIds = Extension.create({
  name: 'paragraphIds',

  addGlobalAttributes() {
    return [
      {
        types: [...ANCHORED_BLOCK_TYPES],
        attributes: {
          pid: {
            default: null,
            keepOnSplit: false,
            parseHTML: (el: HTMLElement) => el.getAttribute('data-pid'),
            renderHTML: (attrs: Record<string, unknown>) => (attrs.pid ? { 'data-pid': attrs.pid } : {}),
          },
        },
      },
    ]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: paragraphIdsKey,
        appendTransaction(transactions, _old, state) {
          if (!transactions.some((t) => t.docChanged || t.getMeta(ENSURE_IDS_META))) return null
          return assignParagraphIds(state)
        },
      }),
    ]
  },
})

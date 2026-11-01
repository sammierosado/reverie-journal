import type { Editor } from '@tiptap/core'
import { ANCHORED_BLOCK_TYPES } from './content'

/**
 * The single live editor. Commands that live outside the editor component
 * (shortcuts, palette, margin notes) reach it through here.
 */
let current: Editor | null = null

export function setActiveEditor(editor: Editor | null): void {
  current = editor
}

export function getActiveEditor(): Editor | null {
  return current && !current.isDestroyed ? current : null
}

const anchored = new Set<string>(ANCHORED_BLOCK_TYPES)

/** The `pid` of the innermost paragraph or heading holding the cursor. */
export function paragraphIdAtCursor(editor: Editor | null = getActiveEditor()): string | null {
  if (!editor) return null
  const { $from } = editor.state.selection
  for (let depth = $from.depth; depth >= 0; depth--) {
    const node = $from.node(depth)
    if (anchored.has(node.type.name)) return (node.attrs.pid as string | null) ?? null
  }
  return null
}

/**
 * Focuses the editor synchronously. Tiptap's own `focus()` waits a frame, and keys
 * typed in that frame would land wherever focus was before (e.g. the title).
 */
export function focusEditorAt(position: 'start' | 'end' | number): void {
  const editor = getActiveEditor()
  if (!editor) return
  editor.view.focus()
  const pos = position === 'start' ? 1 : position === 'end' ? editor.state.doc.content.size - 1 : position
  editor.chain().setTextSelection(pos).scrollIntoView().run()
}

/** Puts the cursor at the end of the paragraph with this `pid` and focuses the editor. */
export function focusParagraph(pid: string): void {
  const editor = getActiveEditor()
  if (!editor) return
  let target: number | null = null
  editor.state.doc.descendants((node, pos) => {
    if (target !== null) return false
    if (node.attrs.pid === pid) {
      target = pos + node.nodeSize - 1
      return false
    }
    return true
  })
  focusEditorAt(target ?? 'end')
}

import { afterEach, describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { ParagraphIds, ENSURE_IDS_META } from '../../src/editor/paragraphIds'
import { extractParagraphs } from '../../src/editor/content'

let editor: Editor | null = null
afterEach(() => editor?.destroy())

function makeEditor(content: object) {
  editor = new Editor({ extensions: [StarterKit, ParagraphIds], content })
  editor.view.dispatch(editor.state.tr.setMeta(ENSURE_IDS_META, true))
  return editor
}

const para = (text: string, pid?: string) => ({
  type: 'paragraph',
  ...(pid ? { attrs: { pid } } : {}),
  content: [{ type: 'text', text }],
})
const pids = (e: Editor) => extractParagraphs(e.getJSON()).map((p) => p.id)

describe('stable paragraph ids', () => {
  it('assigns a unique id to every paragraph and heading', () => {
    const e = makeEditor({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
        para('One'),
        { type: 'bulletList', content: [{ type: 'listItem', content: [para('Nested')] }] },
      ],
    })
    // StarterKit's trailing-node extension appends an empty paragraph after the list; it gets an id too.
    const ids = pids(e)
    expect(ids).toHaveLength(4)
    expect(new Set(ids).size).toBe(4)
    expect(ids.every((id) => /^[0-9a-f]{16}$/.test(id))).toBe(true)
  })

  it('keeps existing ids when content is loaded again', () => {
    const e = makeEditor({ type: 'doc', content: [para('Hi', 'keep-me')] })
    expect(pids(e)).toEqual(['keep-me'])
  })

  it('keeps ids stable while typing and when paragraphs are inserted above', () => {
    const e = makeEditor({ type: 'doc', content: [para('First', 'a'), para('Second', 'b')] })
    e.commands.insertContentAt(0, para('New top'))
    e.commands.insertContentAt(e.state.doc.content.size - 1, ' more')
    const ids = pids(e)
    expect(ids.slice(1)).toEqual(['a', 'b'])
    expect(ids[0]).not.toBe('a')
  })

  it('splitting a paragraph leaves the id with its text and gives the new half a fresh id', () => {
    const e = makeEditor({ type: 'doc', content: [para('Hello world', 'orig')] })
    // Enter at the very start: the empty line above must not steal the id.
    e.chain().setTextSelection(1).splitBlock().run()
    const paras = extractParagraphs(e.getJSON())
    expect(paras).toHaveLength(2)
    expect(paras.find((p) => p.text === 'Hello world')?.id).toBe('orig')
    expect(paras.find((p) => p.text === '')?.id).not.toBe('orig')

    // Enter at the end: the original keeps its id, the new line is fresh.
    e.chain().setTextSelection(e.state.doc.content.size - 1).splitBlock().run()
    const after = extractParagraphs(e.getJSON())
    expect(after.find((p) => p.text === 'Hello world')?.id).toBe('orig')
    expect(new Set(after.map((p) => p.id)).size).toBe(3)
  })

  it('repairs duplicate ids, keeping the id on the longer paragraph', () => {
    const e = makeEditor({ type: 'doc', content: [para('copy', 'dup'), para('The longer original paragraph', 'dup')] })
    const paras = extractParagraphs(e.getJSON())
    expect(paras[1]!.id).toBe('dup')
    expect(paras[0]!.id).not.toBe('dup')
  })

  it('does not record id assignment as an undo step', () => {
    const e = makeEditor({ type: 'doc', content: [para('x')] })
    const before = pids(e)
    e.commands.undo()
    expect(pids(e)).toEqual(before)
  })
})

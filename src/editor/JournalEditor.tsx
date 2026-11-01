import { useEffect, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Focus, Placeholder } from '@tiptap/extensions'
import type { Editor, JSONContent } from '@tiptap/core'
import { ENSURE_IDS_META, ParagraphIds, assignParagraphIds } from './paragraphIds'
import { setActiveEditor } from './editorRegistry'
import { prefersReducedMotion } from '../lib/motion'

interface Props {
  initialContent: JSONContent
  onChange: (content: JSONContent) => void
  /** Called when the writer presses ↑ at the very start of the text. */
  onExitTop: () => void
  typewriterMode: boolean
  placeholder: string
}

/** Keeps the line being written near the middle of the window, like paper in a typewriter. */
function centerCaret(editor: Editor) {
  if (!editor.isFocused) return
  const { head } = editor.state.selection
  const coords = editor.view.coordsAtPos(head)
  const delta = coords.top - window.innerHeight * 0.45
  if (Math.abs(delta) < 4) return
  window.scrollBy({ top: delta, behavior: prefersReducedMotion() || Math.abs(delta) < 60 ? 'auto' : 'smooth' })
}

export function JournalEditor({ initialContent, onChange, onExitTop, typewriterMode, placeholder }: Props) {
  // Callbacks change identity on every render; the editor is created once, so read them through refs.
  const onChangeRef = useRef(onChange)
  const onExitTopRef = useRef(onExitTop)
  const typewriterRef = useRef(typewriterMode)
  const placeholderRef = useRef(placeholder)
  onChangeRef.current = onChange
  onExitTopRef.current = onExitTop
  typewriterRef.current = typewriterMode
  placeholderRef.current = placeholder

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true },
      }),
      ParagraphIds,
      Placeholder.configure({
        placeholder: ({ editor: e, pos }) => (e.isEmpty && pos === 0 ? placeholderRef.current : ''),
      }),
      Focus.configure({ className: 'has-focus', mode: 'shallowest' }),
    ],
    content: initialContent,
    autofocus: 'end',
    editorProps: {
      attributes: {
        class: 'reverie-prose',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'Journal entry',
        spellcheck: 'true',
      },
      handleKeyDown(view, event) {
        const { selection } = view.state
        if (event.key === 'ArrowUp' && selection.empty && selection.from <= 1) {
          event.preventDefault()
          onExitTopRef.current()
          return true
        }
        return false
      },
    },
    onUpdate({ editor: e }) {
      onChangeRef.current(e.getJSON())
      if (typewriterRef.current) centerCaret(e)
    },
    onSelectionUpdate({ editor: e }) {
      if (typewriterRef.current) centerCaret(e)
    },
    // No onDestroy cleanup: the registry ignores destroyed editors, and clearing it here could
    // race with the next entry's editor being created.
  })

  // Registered from an effect rather than `onCreate`: StrictMode and remounts can create
  // throwaway editor instances, and only the one React keeps should receive commands.
  useEffect(() => {
    if (!editor) return
    setActiveEditor(editor)
    // Older or imported content may lack paragraph ids; assign them and persist right away
    // so margin notes attached before the next keystroke are not left detached.
    if (assignParagraphIds(editor.state)) {
      editor.view.dispatch(editor.state.tr.setMeta(ENSURE_IDS_META, true))
      onChangeRef.current(editor.getJSON())
    }
  }, [editor])

  useEffect(() => {
    if (editor && typewriterMode) centerCaret(editor)
  }, [editor, typewriterMode])

  return <EditorContent editor={editor} className="reverie-editor" />
}

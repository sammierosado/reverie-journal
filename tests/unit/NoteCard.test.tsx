import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { freshDatabase } from '../helpers'
import { useJournal } from '../../src/state/journalStore'
import { useUi } from '../../src/state/uiStore'
import { NoteCard } from '../../src/marginalia/NoteCard'
import { ConfirmDialog } from '../../src/components/ConfirmDialog'

const store = () => useJournal.getState()

function Harness({ id }: { id: string }) {
  const note = useJournal((s) => s.annotations.find((a) => a.id === id))
  return (
    <>
      {note && <NoteCard note={note} />}
      <ConfirmDialog />
    </>
  )
}

beforeEach(async () => {
  freshDatabase()
  await store().init()
  useUi.setState({ confirm: null, focusNoteId: null })
})

describe('NoteCard', () => {
  it('edits the note text and cycles its kind', async () => {
    const note = store().addAnnotation('p1', 'right')!
    render(<Harness id={note.id} />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Note in the right margin'), 'Remember this')
    expect(store().annotations[0]!.text).toBe('Remember this')

    await user.click(screen.getByRole('button', { name: /Note type: Note/ }))
    expect(store().annotations[0]!.kind).toBe('reflection')
  })

  it('asks before erasing a note that has words in it', async () => {
    const note = store().addAnnotation('p1', 'left')!
    store().updateAnnotation(note.id, { text: 'Precious' })
    render(<Harness id={note.id} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Erase margin note' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Erase this margin note?')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(store().annotations).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Erase margin note' }))
    await user.click(screen.getByRole('button', { name: 'Erase note' }))
    await waitFor(() => expect(store().annotations).toHaveLength(0))
  })

  it('quietly removes a note left empty when focus moves away', async () => {
    const note = store().addAnnotation('p1', 'left')!
    render(
      <>
        <Harness id={note.id} />
        <button>elsewhere</button>
      </>,
    )
    const user = userEvent.setup()
    await user.click(screen.getByLabelText('Note in the left margin'))
    await user.click(screen.getByText('elsewhere'))
    expect(store().annotations).toHaveLength(0)
  })
})

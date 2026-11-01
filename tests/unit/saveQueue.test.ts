import { describe, expect, it, vi } from 'vitest'
import { createSaveQueue, type SaveState } from '../../src/state/saveQueue'

describe('save queue', () => {
  it('debounces and writes only the latest version of each record', async () => {
    vi.useFakeTimers()
    const writes: string[] = []
    const queue = createSaveQueue(() => {}, 500)
    queue.schedule('entry:1', async () => void writes.push('v1'))
    queue.schedule('entry:1', async () => void writes.push('v2'))
    queue.schedule('entry:2', async () => void writes.push('other'))
    expect(writes).toEqual([])
    await vi.advanceTimersByTimeAsync(500)
    expect(writes).toEqual(['v2', 'other'])
    vi.useRealTimers()
  })

  it('flush writes immediately and reports status', async () => {
    const states: SaveState['status'][] = []
    const queue = createSaveQueue((s) => states.push(s.status), 10_000)
    queue.schedule('k', async () => {})
    await queue.flush()
    expect(states).toEqual(['unsaved', 'saving', 'saved'])
    expect(queue.hasPending()).toBe(false)
  })

  it('keeps a failed write queued and retries it', async () => {
    let fail = true
    let saved = 0
    const queue = createSaveQueue(() => {}, 10_000)
    queue.schedule('k', async () => {
      if (fail) throw new Error('disk full')
      saved++
    })
    await queue.flush()
    expect(queue.getState()).toMatchObject({ status: 'error', error: 'disk full' })
    expect(queue.hasPending()).toBe(true)

    fail = false
    await queue.flush()
    expect(saved).toBe(1)
    expect(queue.getState().status).toBe('saved')
  })
})

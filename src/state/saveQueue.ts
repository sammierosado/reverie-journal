export type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error'

export interface SaveState {
  status: SaveStatus
  lastSavedAt: number | null
  error: string | null
}

type Task = () => Promise<void>

/**
 * Debounced, keyed write queue. Scheduling the same key again replaces the pending task,
 * so only the latest version of a record is written. `flush()` writes everything now
 * and resolves once it is on disk; flushes never overlap.
 */
export function createSaveQueue(onChange: (state: SaveState) => void, delayMs = 600) {
  const pending = new Map<string, Task>()
  let timer: ReturnType<typeof setTimeout> | null = null
  let chain: Promise<void> = Promise.resolve()
  let state: SaveState = { status: 'saved', lastSavedAt: null, error: null }

  const set = (patch: Partial<SaveState>) => {
    state = { ...state, ...patch }
    onChange(state)
  }

  const run = async () => {
    if (pending.size === 0) return
    const batch = [...pending.entries()]
    pending.clear()
    set({ status: 'saving' })
    const failed: [string, Task][] = []
    let lastError: unknown = null
    for (const [key, task] of batch) {
      try {
        await task()
      } catch (err) {
        lastError = err
        // Keep the failed write unless a newer version was scheduled meanwhile.
        if (!pending.has(key)) failed.push([key, task])
      }
    }
    failed.forEach(([k, t]) => pending.set(k, t))
    if (lastError) {
      set({ status: 'error', error: lastError instanceof Error ? lastError.message : String(lastError) })
      // Retry on its own; the writer should not have to notice.
      if (!timer) timer = setTimeout(() => void flush(), 5000)
    } else {
      set({ status: pending.size ? 'unsaved' : 'saved', lastSavedAt: Date.now(), error: null })
    }
  }

  const flush = (): Promise<void> => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    chain = chain.then(run, run)
    return chain
  }

  return {
    schedule(key: string, task: Task, immediate = false) {
      pending.set(key, task)
      if (state.status !== 'saving') set({ status: 'unsaved' })
      if (timer) clearTimeout(timer)
      if (immediate) void flush()
      else timer = setTimeout(() => void flush(), delayMs)
    },
    flush,
    hasPending: () => pending.size > 0 || state.status === 'saving',
    getState: () => state,
  }
}

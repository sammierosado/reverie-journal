import { Component, type ErrorInfo, type ReactNode } from 'react'
import { createBackup } from '../db/backup'
import { downloadText } from '../lib/download'
import { toDayKey } from '../lib/dates'

interface State {
  error: Error | null
}

/** Last line of defense: never strand the writer without a way to rescue their journal. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Reverie crashed', error, info.componentStack)
  }

  private rescue = async () => {
    const backup = await createBackup()
    downloadText(`reverie-rescue-${toDayKey()}.json`, JSON.stringify(backup, null, 2), 'application/json')
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="flex min-h-screen items-center justify-center bg-desk p-6 text-ink">
        <div className="max-w-lg border border-line bg-surface p-10 shadow-veil">
          <h1 className="font-display text-3xl italic">A page came loose.</h1>
          <p className="mt-4 font-serif text-lg leading-relaxed text-ink-muted">
            Something went wrong while drawing the journal. Your writing is stored separately and is most likely safe.
            You can download everything as a backup, then reload.
          </p>
          <pre className="mt-4 overflow-auto bg-desk/60 p-3 font-mono text-xs text-ink-muted">{this.state.error.message}</pre>
          <div className="mt-6 flex gap-3">
            <button type="button" className="btn" onClick={() => void this.rescue()}>
              Download backup
            </button>
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      </main>
    )
  }
}

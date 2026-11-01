import { RefreshCw, X } from 'lucide-react'
import { dismissPrompt, drawPrompt } from '../lib/commands'
import { Feather } from './Ornaments'

export function PromptCard({ prompt }: { prompt: string }) {
  return (
    <figure className="prompt-card" aria-label="Writing prompt">
      <div className="mb-2 flex items-center justify-between">
        <span className="meta-label flex items-center gap-1.5">
          <Feather size={13} className="text-gold" /> A prompt
        </span>
        <span className="flex gap-1">
          <button type="button" className="icon-button-sm" onClick={drawPrompt} aria-label="Draw another prompt" title="Another">
            <RefreshCw size={12} strokeWidth={1.5} aria-hidden />
          </button>
          <button type="button" className="icon-button-sm" onClick={dismissPrompt} aria-label="Put the prompt away" title="Put away">
            <X size={12} strokeWidth={1.5} aria-hidden />
          </button>
        </span>
      </div>
      <blockquote className="font-display text-[19px] leading-snug italic text-ink">{prompt}</blockquote>
    </figure>
  )
}

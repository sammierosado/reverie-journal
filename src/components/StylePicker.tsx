import { Check } from 'lucide-react'
import { useJournal } from '../state/journalStore'
import { AESTHETICS, aestheticVars, getAesthetic, type AestheticId } from '../themes/aesthetics'
import { resolveMode } from '../themes/applyAesthetic'
import { useMediaQuery } from '../lib/useMediaQuery'
import { StyleMark } from './Ornaments'
import type { ThemePreference } from '../db/types'

/**
 * A radio group of style cards. Each preview carries that style's CSS variables inline,
 * so it shows the real colors, fonts and emblem without switching the whole app.
 * Arrow keys move between styles, as with any radio group.
 */
export function StylePicker() {
  const current = getAesthetic(useJournal((s) => s.prefs.aesthetic)).id
  const theme = useJournal((s) => s.prefs.theme)
  const setPrefs = useJournal((s) => s.setPrefs)
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  const mode = resolveMode(theme, systemDark)

  return (
    <div className="flex flex-col gap-5">
      <div role="radiogroup" aria-label="Style" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {AESTHETICS.map((a) => {
          const selected = a.id === current
          return (
            <label key={a.id} className={`style-card ${selected ? 'is-selected' : ''}`}>
              <input
                type="radio"
                name="reverie-style"
                value={a.id}
                checked={selected}
                onChange={() => setPrefs({ aesthetic: a.id as AestheticId })}
                className="sr-only"
              />
              <span className="style-preview" style={aestheticVars(a, mode) as React.CSSProperties} aria-hidden>
                <span className="style-preview-page">
                  <span className="flex items-center justify-between">
                    <StyleMark id={a.id} size={16} className="text-gold" />
                    {selected && (
                      <span className="style-check">
                        <Check size={11} strokeWidth={2.5} />
                      </span>
                    )}
                  </span>
                  <span className="style-preview-title">Dear diary</span>
                  <span className="style-preview-body">Today the light came in sideways…</span>
                  <span className="style-preview-note">a note</span>
                </span>
              </span>
              <span className="mt-2 block font-sans text-[13px] font-semibold text-ink">{a.name}</span>
              <span className="block font-sans text-[12px] leading-snug text-ink-muted">{a.tagline}</span>
            </label>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-sans text-[13px] text-ink-muted">Light or dark</span>
        <div role="radiogroup" aria-label="Light or dark" className="segmented font-sans text-[12px]">
          {(
            [
              ['light', 'Light'],
              ['dark', 'Dark'],
              ['system', 'Match my computer'],
            ] as [ThemePreference, string][]
          ).map(([value, label]) => (
            <button key={value} type="button" role="radio" aria-checked={theme === value} onClick={() => setPrefs({ theme: value })}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

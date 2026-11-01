import { describe, expect, it } from 'vitest'
import { AESTHETICS, aestheticVars, getAesthetic, type ColorMode } from '../../src/themes/aesthetics'

/** WCAG relative luminance of a #rrggbb color. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  ) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

const MODES: ColorMode[] = ['light', 'dark']

describe('aesthetics', () => {
  it('have unique ids and names', () => {
    expect(new Set(AESTHETICS.map((a) => a.id)).size).toBe(AESTHETICS.length)
    expect(new Set(AESTHETICS.map((a) => a.name)).size).toBe(AESTHETICS.length)
  })

  for (const a of AESTHETICS) {
    for (const mode of MODES) {
      it(`${a.name} (${mode}) keeps text readable`, () => {
        const p = a[mode]
        // WCAG AA: 4.5:1 for body text. Writing is the point, so the main ink aims higher.
        expect(contrast(p.ink, p.page), 'ink on page').toBeGreaterThanOrEqual(7)
        expect(contrast(p.inkMuted, p.page), 'muted text on page').toBeGreaterThanOrEqual(4.5)
        expect(contrast(p.inkMuted, p.surface), 'muted text on dialogs').toBeGreaterThanOrEqual(4.5)
        expect(contrast(p.ink, p.desk), 'ink on desk').toBeGreaterThanOrEqual(4.5)
        expect(contrast(p.accentInk, p.accent), 'button text').toBeGreaterThanOrEqual(4.5)
        expect(contrast(p.danger, p.surface), 'warning text').toBeGreaterThanOrEqual(4.5)
      })
    }
  }

  it('produces a complete set of CSS variables, with quoted strings for generated content', () => {
    const vars = aestheticVars(getAesthetic('sugar-cloud'), 'light')
    expect(vars['--rv-bullet']).toBe('"♡"')
    expect(vars['--rv-font-display']).toContain('Fredoka')
    expect(Object.values(vars).every((v) => v.length > 0)).toBe(true)
  })

  it('falls back to the default style for unknown ids', () => {
    expect(getAesthetic('no-such-style').id).toBe('fallen-angel')
    expect(getAesthetic(undefined).id).toBe('fallen-angel')
  })
})

import type { ThemePreference } from '../db/types'
import { aestheticVars, getAesthetic, type ColorMode } from './aesthetics'

/** localStorage key read by the inline script in index.html before the app loads. */
export const FIRST_PAINT_KEY = 'reverie-paint'

export function resolveMode(theme: ThemePreference, systemDark: boolean): ColorMode {
  return theme === 'system' ? (systemDark ? 'dark' : 'light') : theme
}

/** Applies a style's CSS variables to an element (the whole app when given <html>). */
export function applyAesthetic(el: HTMLElement, aestheticId: string, mode: ColorMode): void {
  const aesthetic = getAesthetic(aestheticId)
  for (const [name, value] of Object.entries(aestheticVars(aesthetic, mode))) el.style.setProperty(name, value)
  el.dataset.theme = mode
  el.dataset.aesthetic = aesthetic.id
}

/**
 * Preferences live in IndexedDB, which loads after first paint. A small copy of the style's
 * variables in localStorage lets index.html paint the right colors and fonts immediately.
 */
export function rememberForFirstPaint(theme: ThemePreference, aestheticId: string): void {
  const aesthetic = getAesthetic(aestheticId)
  try {
    localStorage.setItem(
      FIRST_PAINT_KEY,
      JSON.stringify({ theme, light: aestheticVars(aesthetic, 'light'), dark: aestheticVars(aesthetic, 'dark') }),
    )
  } catch {
    // Storage blocked: the first frame uses the default style, then the app applies the right one.
  }
}

/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// A fixed port matters: IndexedDB is scoped to the origin (host + port),
// so the journal is only found again if the app is always served from the same one.
const PORT = 4317

/** Emits sw.js with the exact list of built files, so the whole app is cached for offline use. */
function serviceWorker(): Plugin {
  // Relative to sw.js, so the same build works at a domain root or under a subpath (GitHub Pages).
  const publicFiles = ['./', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png']
  return {
    name: 'reverie-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      // Font subsets for scripts the app isn't written in (Cyrillic, Greek, Vietnamese…) stay out of
      // the offline cache; the browser still fetches them online if a page ever needs them.
      const skipped = /-(cyrillic|cyrillic-ext|greek|greek-ext|vietnamese|hebrew|math|symbols)-/
      const files = [...publicFiles, ...Object.keys(bundle).filter((f) => !skipped.test(f)).map((f) => `./${f}`)]
      const version = createHash('sha256').update(files.join('|')).digest('hex').slice(0, 12)
      const source = readFileSync('sw-template.js', 'utf8')
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(files))
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

export default defineConfig({
  // Relative asset URLs: the app can be hosted at any path, e.g. https://user.github.io/reverie-journal/.
  base: './',
  plugins: [react(), tailwindcss(), serviceWorker()],
  server: { port: PORT, strictPort: true },
  preview: { port: PORT, strictPort: true },
  // One bundle is fine for an app served from this computer, and keeps the offline cache simple.
  build: { chunkSizeWarningLimit: 1000 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}'],
  },
})

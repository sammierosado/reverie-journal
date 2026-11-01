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
  const publicFiles = ['/', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png']
  return {
    name: 'reverie-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = [...publicFiles, ...Object.keys(bundle).map((f) => `/${f}`)]
      const version = createHash('sha256').update(files.join('|')).digest('hex').slice(0, 12)
      const source = readFileSync('sw-template.js', 'utf8')
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(files))
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

export default defineConfig({
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

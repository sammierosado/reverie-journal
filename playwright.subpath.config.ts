import { defineConfig } from '@playwright/test'
import base from './playwright.config'

// Serves the build under /reverie-journal/, the way GitHub Pages hosts a project site.
export default defineConfig({
  ...base,
  use: { ...base.use, baseURL: 'http://localhost:4319/reverie-journal/' },
  webServer: {
    command: 'npx vite preview --port 4319 --strictPort --base /reverie-journal/',
    url: 'http://localhost:4319/reverie-journal/',
    reuseExistingServer: false,
  },
})

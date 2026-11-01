import { defineConfig } from '@playwright/test'

// Uses the Microsoft Edge already installed on Windows, so no browser download is needed.
// Runs against the production build to exercise exactly what ships.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4318',
    channel: 'msedge',
    acceptDownloads: true,
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: 'npx vite preview --port 4318 --strictPort',
    url: 'http://localhost:4318',
    reuseExistingServer: false,
  },
})

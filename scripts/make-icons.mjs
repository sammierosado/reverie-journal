// Renders public/icon.svg to the PNG sizes Windows and Chromium want for installed apps.
// Usage: node scripts/make-icons.mjs   (uses the Microsoft Edge already on the machine)
import { readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const svg = readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf8')
const browser = await chromium.launch({ channel: 'msedge' })
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{width:${size}px;height:${size}px;display:block}</style>${svg}`)
  await page.screenshot({ path: new URL(`../public/icon-${size}.png`, import.meta.url).pathname.slice(1), omitBackground: true })
  await page.close()
}
await browser.close()
console.log('icons written')

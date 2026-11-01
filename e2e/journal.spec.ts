import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

const editor = (page: Page) => page.locator('.ProseMirror')
const status = (page: Page) => page.getByRole('status').first()

async function writeEntry(page: Page, title: string, paragraphs: string[]) {
  await page.locator('#entry-title').click()
  await page.keyboard.type(title)
  await page.keyboard.press('Enter')
  for (const [i, p] of paragraphs.entries()) {
    if (i > 0) await page.keyboard.press('Enter')
    await page.keyboard.type(p)
  }
}

async function waitForSave(page: Page) {
  await expect(status(page)).toContainText('Saved')
}

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await expect(editor(page)).toBeVisible()
})

test('opens straight into the writing experience', async ({ page }) => {
  await expect(page.locator('#entry-title')).toHaveAttribute('placeholder', 'Untitled')
  await expect(editor(page)).toBeFocused()
  await expect(status(page)).toContainText('A fresh page')
})

test('writes an entry with notes in both margins and finds it all again after reopening', async ({ page }) => {
  await writeEntry(page, 'Falling stars', ['The air smelled of rain and old paper.', 'Tomorrow, the river at dawn.'])

  // Right-margin note on the paragraph with the cursor (the second one).
  await page.keyboard.press('Control+BracketRight')
  await page.keyboard.type('Bring the green notebook.')
  await page.keyboard.press('Escape')
  await expect(editor(page)).toBeFocused()

  // Left-margin note on the first paragraph.
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Control+BracketLeft')
  await page.keyboard.type('Which book was this?')
  await page.keyboard.press('Escape')
  await waitForSave(page)

  await page.reload()
  await expect(page.locator('#entry-title')).toHaveValue('Falling stars')
  await expect(editor(page)).toContainText('The air smelled of rain and old paper.')
  await expect(editor(page)).toContainText('Tomorrow, the river at dawn.')

  const left = page.getByRole('complementary', { name: 'Left margin' }).locator('textarea.note-text')
  const right = page.getByRole('complementary', { name: 'Right margin' }).locator('textarea.note-text')
  await expect(left).toHaveValue('Which book was this?')
  await expect(right).toHaveValue('Bring the green notebook.')

  // The right note sits level with its paragraph. The left one may be nudged below the entry
  // details at the top of the left margin, and a leader line then connects it to its paragraph.
  const firstPara = (await editor(page).locator('p').nth(0).boundingBox())!
  const secondPara = (await editor(page).locator('p').nth(1).boundingBox())!
  const leftBox = (await left.boundingBox())!
  const rightBox = (await right.boundingBox())!
  expect(Math.abs(rightBox.y - secondPara.y)).toBeLessThan(40)
  expect(leftBox.y).toBeGreaterThan(firstPara.y - 40)
  expect(leftBox.y).toBeLessThan(firstPara.y + 160)
  await expect(page.locator('.margin-leader line')).toHaveCount(2)
})

test('margin notes can be added by clicking beside a paragraph', async ({ page }) => {
  await writeEntry(page, 'Clicking', ['A paragraph worth a note.'])
  const para = await editor(page).locator('p').first().boundingBox()
  const margin = page.getByRole('complementary', { name: 'Right margin' })
  const marginBox = (await margin.boundingBox())!
  await page.mouse.move(marginBox.x + marginBox.width / 2, para!.y + para!.height / 2)
  await page.getByRole('button', { name: /Add a note in the right margin/ }).click()
  await page.keyboard.type('Clicked into being.')
  await page.keyboard.press('Escape')
  await waitForSave(page)
  await page.reload()
  await expect(margin.locator('textarea.note-text')).toHaveValue('Clicked into being.')
})

test('navigates between entries and searches the journal', async ({ page }) => {
  await writeEntry(page, 'Moth and lantern', ['A moth circled the lantern all evening.'])
  await waitForSave(page)

  await page.keyboard.press('Alt+KeyN')
  await expect(page.locator('#entry-title')).toHaveValue('')
  await writeEntry(page, 'Second page', ['Nothing about insects here.'])
  await waitForSave(page)

  // Previous entry.
  await page.keyboard.press('Alt+PageUp')
  await expect(page.locator('#entry-title')).toHaveValue('Moth and lantern')

  // Search by content.
  await page.keyboard.press('Alt+PageDown')
  await expect(page.locator('#entry-title')).toHaveValue('Second page')
  await page.keyboard.press('Control+KeyK')
  await page.keyboard.type('lantern')
  await expect(page.getByRole('option').first()).toContainText('Moth and lantern')
  await page.keyboard.press('Enter')
  await expect(page.locator('#entry-title')).toHaveValue('Moth and lantern')

  // The journal drawer lists both.
  await page.keyboard.press('Alt+KeyJ')
  const list = page.getByRole('list', { name: 'Entries' })
  await expect(list.locator('.entry-row')).toHaveCount(2)
})

test('exports an entry as Markdown with margin notes as footnotes', async ({ page }) => {
  await writeEntry(page, 'Exported evening', ['A line to keep.'])
  await page.keyboard.press('Control+BracketRight')
  await page.keyboard.type('A note beside it.')
  await page.keyboard.press('Escape')
  await waitForSave(page)

  await page.keyboard.press('Control+Comma')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'This entry (.md)' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/exported-evening\.md$/)
  const md = readFileSync((await download.path())!, 'utf8')
  expect(md).toContain('# Exported evening')
  expect(md).toContain('A line to keep.[^1]')
  expect(md).toContain('[^1]: *Right margin · note:* A note beside it.')
})

test('backs up, deletes and restores the journal', async ({ page }) => {
  await writeEntry(page, 'Keep me safe', ['Precious words.'])
  await page.keyboard.press('Control+BracketLeft')
  await page.keyboard.type('And a precious note.')
  await page.keyboard.press('Escape')
  await waitForSave(page)

  await page.keyboard.press('Control+Comma')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download backup (.json)' }).click(),
  ])
  const backupPath = (await download.path())!
  const backup = JSON.parse(readFileSync(backupPath, 'utf8'))
  expect(backup.app).toBe('reverie-journal')
  expect(backup.entries).toHaveLength(1)
  expect(backup.annotations).toHaveLength(1)
  await page.keyboard.press('Escape')

  // Delete it, with confirmation.
  await page.keyboard.press('Control+KeyK')
  await page.keyboard.type('delete this entry')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('alertdialog')).toContainText('Delete this entry?')
  await page.getByRole('button', { name: 'Delete entry' }).click()
  await expect(page.locator('#entry-title')).toHaveValue('')

  // Restore (merge) from the file.
  await page.keyboard.press('Control+Comma')
  await page.locator('input[type=file]').setInputFiles(backupPath)
  await expect(page.getByRole('alertdialog')).toContainText('1 entries and 1 margin notes')
  await page.getByRole('button', { name: 'Merge backup' }).click()
  await expect(page.getByText('Restored 1 entries and 1 notes')).toBeVisible()

  await page.keyboard.press('Control+KeyK')
  await page.keyboard.type('precious')
  await page.keyboard.press('Enter')
  await expect(page.locator('#entry-title')).toHaveValue('Keep me safe')
  await expect(page.locator('textarea.note-text')).toHaveValue('And a precious note.')
})

test('rejects a file that is not a backup', async ({ page }) => {
  await page.keyboard.press('Control+Comma')
  await page.locator('input[type=file]').setInputFiles({ name: 'nope.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') })
  await expect(page.getByRole('alert')).toContainText('not a Reverie Journal backup')
})

test('changes the style, keeps the writing, and remembers the choice', async ({ page }) => {
  await writeEntry(page, 'Game day', ['We won in overtime.'])
  await waitForSave(page)

  await page.getByRole('button', { name: 'Choose your style' }).click()
  const dialog = page.getByRole('dialog', { name: 'Choose your style' })
  await dialog.getByText('Varsity', { exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-aesthetic', 'varsity')
  await expect(page.locator('#entry-title')).toHaveCSS('text-transform', 'uppercase')
  expect(await page.locator('#entry-title').evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Oswald')
  await page.keyboard.press('Escape')
  await expect(editor(page)).toContainText('We won in overtime.')

  // Survives a reload, and the very first paint already uses the remembered style.
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-aesthetic', 'varsity')
  await expect(page.locator('#entry-title')).toHaveValue('Game day')

  // Every style can be chosen from the command palette too.
  await page.keyboard.press('Control+KeyK')
  await page.keyboard.type('style: the bronx')
  await page.keyboard.press('Enter')
  await expect(page.locator('html')).toHaveAttribute('data-aesthetic', 'the-bronx')
})

test('every style renders with its own fonts and colors', async ({ page }) => {
  await page.getByRole('button', { name: 'Choose your style' }).click()
  const radios = page.getByRole('dialog', { name: 'Choose your style' }).locator('input[name="reverie-style"]')
  const count = await radios.count()
  expect(count).toBeGreaterThanOrEqual(9)
  const seen = new Set<string>()
  for (let i = 0; i < count; i++) {
    await radios.nth(i).check({ force: true })
    const look = await page.evaluate(() => {
      const css = getComputedStyle(document.documentElement)
      return `${css.getPropertyValue('--rv-page')}|${css.getPropertyValue('--rv-font-display')}`
    })
    expect(look).not.toBe('|')
    seen.add(look)
  }
  expect(seen.size).toBe(count)
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true })

  test('everything fits on screen and every essential is one tap away', async ({ page }) => {
    // Nothing sticks out past the right edge.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)

    const bar = page.locator('header.chrome')
    for (const name of ['Open journal', 'Search and commands', 'Margin notes', 'Choose your style', 'Settings and backups']) {
      const button = bar.getByRole('button', { name: new RegExp(name) })
      await expect(button).toBeInViewport({ ratio: 1 })
    }

    // Write, then add a margin note through the notes panel.
    await page.locator('#entry-title').tap()
    await page.keyboard.type('On the bus')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Writing with my thumbs.')
    await bar.getByRole('button', { name: 'Margin notes' }).tap()
    await page.getByRole('button', { name: 'Right note here' }).tap()
    await page.keyboard.type('Thumbs are slow.')
    await page.keyboard.press('Escape')
    await waitForSave(page)

    // Style picker works by tap.
    await bar.getByRole('button', { name: 'Choose your style' }).tap()
    await page.getByRole('dialog', { name: 'Choose your style' }).getByText('Sugar Cloud', { exact: true }).tap()
    await expect(page.locator('html')).toHaveAttribute('data-aesthetic', 'sugar-cloud')
  })

  test('focus mode can be left without a keyboard', async ({ page }) => {
    await page.locator('header.chrome').getByRole('button', { name: 'Search and commands' }).tap()
    await page.keyboard.type('focus mode')
    await page.getByRole('option', { name: /Focus mode/ }).tap()
    await expect(page.locator('header.chrome')).toHaveCount(0)
    await page.getByRole('button', { name: /Leave focus mode/ }).tap()
    await expect(page.locator('header.chrome')).toBeVisible()
  })
})

test('works offline once it has been opened', async ({ page, context }) => {
  await writeEntry(page, 'Offline page', ['Written with the network on.'])
  await waitForSave(page)
  await page.evaluate(() => navigator.serviceWorker.ready)
  // Let the worker take control of the page before going offline.
  await page.reload()
  await expect(editor(page)).toBeVisible()

  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('#entry-title')).toHaveValue('Offline page')
  await editor(page).click()
  await page.keyboard.press('Control+End')
  await page.keyboard.type(' And more while offline.')
  await waitForSave(page)
  await page.reload()
  await expect(editor(page)).toContainText('And more while offline.')
  await context.setOffline(false)
})

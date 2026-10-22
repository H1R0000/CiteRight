import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:5173'
await mkdir('docs/screenshots', { recursive: true })
await mkdir('.impeccable/review', { recursive: true })
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined })
try {
  for (const [name, viewport, colorScheme] of [
    ['desktop', { width: 1440, height: 1000 }, 'light'],
    ['mobile', { width: 390, height: 844 }, 'light'],
    ['dark', { width: 1440, height: 1000 }, 'dark'],
  ]) {
    const context = await browser.newContext({ viewport, colorScheme, reducedMotion: 'reduce' })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(base)
    await page.getByRole('heading', { name: 'Big ideas. Proper credit.' }).waitFor()
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: `docs/screenshots/${name}.png`, fullPage: true })
    await page.screenshot({ path: `.impeccable/review/${name}.png`, fullPage: true })
    console.log(
      JSON.stringify({
        name,
        overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        errors,
      }),
    )
    if (name === 'desktop') {
      await page.goto(`${base}/editor/new`)
      await page
        .getByLabel('Book title')
        .fill('Behave: The biology of humans at our best and worst')
      await page.getByLabel('Given name(s)').fill('Robert M.')
      await page.getByLabel('Family name', { exact: true }).fill('Sapolsky')
      await page.getByLabel('Publication year').fill('2017')
      await page.getByLabel(/^Publisher/).fill('Penguin Books')
      await page.getByTestId('bibliography-preview').waitFor()
      await page.screenshot({ path: 'docs/screenshots/editor.png', fullPage: true })
      await page.screenshot({ path: '.impeccable/review/editor.png', fullPage: true })
    }
    await context.close()
  }
} finally {
  await browser.close()
}

import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined })
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  })
  const capture = process.env.CAPTURE_SCREENSHOTS === '1'
  if (capture) await mkdir('docs/screenshots', { recursive: true })
  const responses = []
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('response', (response) => {
    if (response.url().startsWith('https://api.crossref.org/'))
      responses.push({ url: response.url(), status: response.status() })
  })
  await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:5173')
  await page.getByRole('button', { name: 'Research papers', exact: true }).click()
  await page
    .getByLabel('Paste the paper’s DOI or DOI link')
    .fill('https://doi.org/10.1037/ppm0000185')
  await page.getByRole('button', { name: 'Find paper', exact: true }).click()
  await page.getByRole('button', { name: 'Review paper', exact: true }).waitFor({ timeout: 60000 })
  if (capture)
    await page.screenshot({ path: 'docs/screenshots/article-lookup.png', fullPage: true })
  await page.getByRole('button', { name: 'Review paper', exact: true }).click()
  await page.getByTestId('bibliography-preview').waitFor()
  const result = {
    title: await page.getByLabel('Article title').inputValue(),
    year: await page.getByLabel('Publication year').inputValue(),
    journal: await page.getByLabel('Journal name').inputValue(),
    doi: await page.getByLabel('DOI', { exact: false }).last().inputValue(),
    citation: await page.getByTestId('bibliography-preview').innerText(),
    responses,
    errors,
  }
  assert.equal(result.year, '2019')
  assert.equal(result.journal, 'Psychology of Popular Media Culture')
  assert.equal(result.doi, '10.1037/ppm0000185')
  assert.deepEqual(errors, [])
  if (capture) {
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: 'docs/screenshots/article-editor.png', fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    )
    await page.screenshot({ path: 'docs/screenshots/article-mobile.png', fullPage: true })
  }
  console.log(JSON.stringify(result, null, 2))
} finally {
  await browser.close()
}

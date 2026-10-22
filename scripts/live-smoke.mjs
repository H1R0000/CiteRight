import { chromium } from '@playwright/test'
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined })
try {
  const page = await browser.newPage()
  const responses = []
  page.on('response', (response) => {
    if (response.url().startsWith('https://openlibrary.org/'))
      responses.push({ url: response.url(), status: response.status() })
  })
  await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:5173')
  await page.getByLabel('Search books by title, author, or ISBN').fill('9780140328721')
  await page.getByRole('button', { name: 'Review this edition' }).waitFor({ timeout: 45000 })
  await page.getByRole('button', { name: 'Review this edition' }).click()
  await page.getByRole('button', { name: 'Use this edition' }).click()
  await page.getByTestId('bibliography-preview').waitFor({ timeout: 60000 })
  console.log(
    JSON.stringify(
      {
        flow: 'Live ISBN lookup → edition → citation',
        title: await page.getByLabel('Book title').inputValue(),
        year: await page.getByLabel('Publication year').inputValue(),
        publisher: await page.getByLabel(/^Publisher/).inputValue(),
        bibliography: await page.getByTestId('bibliography-preview').innerText(),
        responses,
      },
      null,
      2,
    ),
  )
} finally {
  await browser.close()
}

import { chromium } from '@playwright/test'

// Local cold-context timings are diagnostics, not a public-network benchmark.
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined })
try {
  for (const route of ['/', '/editor/new', '/library']) {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(`http://127.0.0.1:4173${route}`)
    await page.locator('main h1').waitFor()
    const metrics = await page.evaluate(() => ({
      route: location.pathname,
      headingReadyMs: Math.round(performance.now()),
      domContentLoadedMs: Math.round(
        performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd,
      ),
    }))
    console.log(JSON.stringify(metrics))
    await context.close()
  }
} finally {
  await browser.close()
}

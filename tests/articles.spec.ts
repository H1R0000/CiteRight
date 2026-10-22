import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { crossrefArticle, crossrefConference } from '../src/test/article-fixtures'

test('the reported IEEE conference DOI opens as a published proceedings paper', async ({
  page,
}) => {
  await page.route('https://api.crossref.org/**', (route) =>
    route.fulfill({ json: { message: crossrefConference } }),
  )
  await page.goto('/')
  await page.getByRole('button', { name: 'Research papers', exact: true }).click()
  await page
    .getByLabel('Paste the paper’s DOI or DOI link')
    .fill('https://doi.org/10.1109/ICSSAS66150.2025.11080972')
  await page.getByRole('button', { name: 'Find paper', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Paper match' })).toContainText('Conference paper')
  await page.getByRole('button', { name: 'Review paper', exact: true }).click()
  await expect(page.getByLabel('Source type')).toHaveValue('paper-conference')
  await expect(page.getByLabel('Proceedings title')).toHaveValue(
    crossrefConference['container-title'][0],
  )
  await expect(page.getByLabel(/^Publisher/)).toHaveValue('IEEE')
  await expect(page.getByLabel('Paper page range')).toHaveValue('141-148')
  await expect(page.getByLabel('Journal name')).toHaveCount(0)
  await expect(page.getByTestId('bibliography-preview')).toContainText('(pp. 141–148). IEEE.')
  await page.getByText('Proceedings editors', { exact: false }).first().click()
  await page.getByRole('button', { name: 'Add proceedings editor' }).click()
  await page.getByLabel('Editor 1: given name(s)').fill('Test')
  await page.getByLabel('Editor 1: family name').fill('Editor')
  await expect(page.getByTestId('bibliography-preview')).toContainText('T. Editor (Ed.)')
  await page.getByRole('button', { name: 'Remove editor 1' }).click()
  await page.getByRole('button', { name: 'Save to my library' }).click()
  await page.getByRole('link', { name: /My library/ }).click()
  await expect(page.locator('.reference-tags')).toContainText('Conference paper')
  await page.reload()
  await page.getByRole('link', { name: `Edit ${crossrefConference.title[0]}`, exact: true }).click()
  await expect(page.getByLabel('Source type')).toHaveValue('paper-conference')
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([])
})

test('DOI article lookup, correct formatting, persistence, exports, and duplicates', async ({
  page,
}) => {
  await page.route('https://api.crossref.org/**', (route) =>
    route.fulfill({ json: { message: crossrefArticle } }),
  )
  await page.goto('/')
  await page.getByRole('button', { name: 'Research papers', exact: true }).click()
  await page
    .getByLabel('Paste the paper’s DOI or DOI link')
    .fill('https://doi.org/10.1037/ppm0000185')
  await page.getByRole('button', { name: 'Find paper', exact: true }).click()
  await page.getByRole('button', { name: 'Review paper', exact: true }).click()
  await expect(page.getByLabel('Source type')).toHaveValue('article-journal')
  await expect(page.getByLabel('Article title')).toHaveValue(crossrefArticle.title[0])
  await expect(page.getByLabel('Publication year')).toHaveValue('2019')
  await expect(page.getByLabel('Journal name')).toHaveValue('Psychology of Popular Media Culture')
  await expect(page.getByTestId('bibliography-preview')).toContainText('8(3), 207–217')
  await expect(page.getByTestId('bibliography-preview').locator('i').first()).toHaveText(
    'Psychology of Popular Media Culture',
  )
  await page.getByLabel('Page or page range').fill('210')
  await expect(page.getByTestId('intext-preview')).toHaveText('(Grady et al., 2019, p. 210)')
  await page
    .getByRole('group', { name: 'Citation style', exact: true })
    .last()
    .getByRole('button', { name: 'MLA 9' })
    .click()
  await expect(page.getByTestId('bibliography-preview')).toContainText(
    'vol. 8, no. 3, 2019, pp. 207–17',
  )
  await expect(page.getByTestId('intext-preview')).toHaveText('(Grady et al. 210)')
  await page.getByRole('button', { name: 'Save to my library' }).click()
  await page.getByRole('link', { name: /My library/ }).click()
  await expect(page.locator('.reference-tags')).toContainText('Journal article')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'JSON', exact: true }).click()
  const path = await (await downloadPromise).path()
  await page.locator('input[type=file]').setInputFiles(path!)
  await expect(page.getByRole('dialog')).toContainText('1 matching references skipped')
  await page.getByRole('button', { name: 'Import references', exact: true }).click()
  await page.reload()
  await page.getByRole('link', { name: `Edit ${crossrefArticle.title[0]}`, exact: true }).click()
  await expect(page.getByLabel('Article page range')).toHaveValue('207-217')
  await expect(page.getByLabel('Journal name')).toHaveValue('Psychology of Popular Media Culture')
})

test('invalid and missing DOIs recover through manual article entry without losing a draft', async ({
  page,
}) => {
  await page.route('https://api.crossref.org/**', (route) => route.fulfill({ status: 404 }))
  await page.goto('/editor/new')
  await page.getByLabel('Book title').fill('Keep this draft')
  await page.goto('/')
  await page.getByRole('button', { name: 'Research papers', exact: true }).click()
  const input = page.getByLabel('Paste the paper’s DOI or DOI link')
  await input.fill('https://scholar.google.com/scholar?q=test')
  await page.getByRole('button', { name: 'Find paper', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('not a Google Scholar')
  await input.fill('10.1234/missing')
  await page.getByRole('button', { name: 'Find paper', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('No Crossref record')
  await page.getByRole('button', { name: 'Enter paper manually' }).click()
  await expect(page.getByRole('dialog')).toContainText('unfinished citation')
  await page.getByRole('button', { name: 'Resume draft', exact: true }).click()
  await expect(page.getByLabel('Book title')).toHaveValue('Keep this draft')
  await page.getByLabel('Source type').selectOption('article-journal')
  await page.getByLabel('Article title').fill('A manually entered study')
  await page.getByLabel('Journal name').fill('Example Journal')
  await page.getByLabel('Volume', { exact: false }).fill('12')
  await page.getByLabel('Article number').fill('e123')
  await page.reload()
  await expect(page.getByLabel('Source type')).toHaveValue('article-journal')
  await expect(page.getByTestId('bibliography-preview')).toContainText('Article e123')
  await expect(page.getByLabel(/^ISBN/)).toHaveCount(0)
})

test('article lookup and editor are accessible in light and dark mobile/desktop layouts', async ({
  page,
}) => {
  // Audit settled colors, not intermediate animation/theme-transition frames.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Research papers', exact: true }).click()
  for (const theme of ['light', 'dark']) {
    await page.getByRole('button', { name: 'Color theme' }).click()
    await page.getByRole('menuitemradio', { name: theme, exact: false }).click()
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.getByRole('button', { name: 'Enter paper manually' }).click()
  await page.getByLabel('Article title').fill('A journal article')
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

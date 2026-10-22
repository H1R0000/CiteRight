import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const edition = {
  key: '/books/OL7353617M',
  title: 'Fantastic Mr. Fox',
  publish_date: '1988',
  publishers: ['Puffin'],
  edition_name: 'Reprint',
  isbn_13: ['9780140328721'],
  authors: [{ key: '/authors/OL34184A' }],
  works: [{ key: '/works/OL45804W' }],
  languages: [{ key: '/languages/eng' }],
}
const secondEdition = {
  ...edition,
  key: '/books/OL999999M',
  publish_date: '2007',
  publishers: ['Different Press'],
  isbn_13: [],
  edition_name: 'Revised edition',
}
async function mockOpenLibrary(page: Page) {
  await page.route('https://openlibrary.org/**', (route) => {
    const url = new URL(route.request().url())
    const json =
      url.pathname === '/search.json'
        ? {
            numFound: 1,
            docs: [
              {
                key: '/works/OL45804W',
                title: 'Fantastic Mr. Fox',
                author_name: ['Roald Dahl'],
                first_publish_year: 1970,
                edition_count: 2,
              },
            ],
          }
        : url.pathname.endsWith('/editions.json')
          ? { size: 2, entries: [edition, secondEdition] }
          : url.pathname.startsWith('/authors/')
            ? { name: 'Roald Dahl' }
            : url.pathname.includes('OL999999M')
              ? secondEdition
              : edition
    return route.fulfill({ json })
  })
  await page.route('https://covers.openlibrary.org/**', (route) => route.fulfill({ status: 404 }))
}
async function manualBook(page: Page, title = 'A very good book') {
  await page.goto('/editor/new')
  await page.getByLabel('Book title').fill(title)
  await page.getByLabel('Given name(s)').fill('Jane')
  await page.getByLabel('Family name', { exact: true }).fill('Smith')
  await page.getByLabel('Publication year').fill('2021')
  await page.getByLabel(/^Publisher/).fill('Useful Press')
}
test.beforeEach(async ({ page }) => {
  await mockOpenLibrary(page)
})

test('search, compare exact editions, generate, save, and prevent duplicate references', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByLabel('Search books by title, author, or ISBN').fill('Fantastic Mr. Fox')
  await page.getByRole('button', { name: /Fantastic Mr. Fox.*Roald Dahl/ }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByLabel('Compare', { exact: true }).nth(0).check()
  await page.getByLabel('Compare', { exact: true }).nth(1).check()
  await expect(page.getByRole('table')).toContainText('2007')
  await page.getByRole('button', { name: 'Use this edition' }).nth(1).click()
  await expect(page.getByLabel('Publication year')).toHaveValue('2007')
  await expect(page.getByLabel(/^Publisher/)).toHaveValue('Different Press')
  await expect(page.getByLabel(/^ISBN/)).toHaveValue('')
  await expect(page.getByTestId('bibliography-preview')).toContainText('Dahl, R. (2007)')
  await page.getByRole('button', { name: 'I’ve reviewed the imported details' }).click()
  await page.getByRole('button', { name: 'Save to my library' }).click()
  await expect(page.getByText('Reference saved.', { exact: false })).toBeVisible()
  await page.getByRole('link', { name: /My library/ }).click()
  await expect(page.locator('.reference-row')).toHaveCount(1)
  await page.reload()
  await expect(page.locator('.reference-row')).toHaveCount(1)
  await page.goto('/?q=Fantastic+Mr.+Fox')
  await page.getByRole('button', { name: /Fantastic Mr. Fox.*Roald Dahl/ }).click()
  await page.getByRole('button', { name: 'Use this edition' }).nth(1).click()
  await page.getByRole('button', { name: 'Save to my library' }).click()
  await expect(
    page.getByRole('dialog', { name: 'This book is already on your shelf' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Replace existing' }).click()
  await page.getByRole('link', { name: /My library/ }).click()
  await expect(page.locator('.reference-row')).toHaveCount(1)
})

test('manual drafts recover, explain formatting, and copy failures are honest', async ({
  page,
}) => {
  await manualBook(page)
  await page.reload()
  await expect(page.getByLabel('Book title')).toHaveValue('A very good book')
  await page.getByRole('button', { name: 'MLA 9' }).last().click()
  await expect(page.getByTestId('bibliography-preview')).toContainText('Smith, Jane.')
  await page.getByLabel('Page or page range').fill('124-128')
  await expect(page.getByTestId('intext-preview')).toHaveText('(Smith 124–28)')
  await page.getByText('Why does it look like this?').click()
  await expect(page.getByText('Read MLA’s book examples')).toBeVisible()
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: () => Promise.reject(new Error('Clipboard is blocked')),
        write: () => Promise.reject(new Error('Clipboard is blocked')),
      },
    }),
  )
  await page.getByRole('button', { name: 'Copy citation', exact: true }).click()
  await expect(page.getByText('Clipboard is blocked')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copied!' })).toHaveCount(0)
})

test('collections, selection, exports, import preview, delete and undo', async ({ page }) => {
  await manualBook(page, 'A research adventure')
  await page.getByRole('button', { name: 'New', exact: true }).click()
  await page.getByLabel('Collection name', { exact: true }).fill('My thesis')
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await page.getByRole('button', { name: 'Save to my library' }).click()
  await page.getByRole('link', { name: /My library/ }).click()
  await expect(page.locator('.reference-tags')).toContainText('My thesis')
  await page.getByRole('checkbox', { name: 'Select A research adventure', exact: true }).check()
  await expect(page.getByRole('button', { name: 'Copy selected (1)' })).toBeEnabled()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'JSON', exact: true }).click()
  const download = await downloadPromise
  const path = await download.path()
  expect(path).toBeTruthy()
  await page.locator('input[type=file]').setInputFiles(path!)
  await expect(page.getByRole('dialog', { name: 'Bring your references along' })).toContainText(
    '1 matching references skipped',
  )
  await page.getByRole('button', { name: 'Import references', exact: true }).click()
  await expect(page.locator('.reference-row')).toHaveCount(1)
  await page.getByRole('button', { name: 'Delete A research adventure' }).click()
  await expect(page.locator('.reference-row')).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.locator('.reference-row')).toHaveCount(1)
  await page.getByRole('button', { name: 'My thesis 1', exact: true }).click()
  await page.getByRole('button', { name: 'Delete collection My thesis' }).click()
  await page.getByRole('button', { name: 'Remove collection', exact: true }).click()
  await expect(page.locator('.reference-row')).toHaveCount(1)
  await expect(page.locator('.reference-tags')).not.toContainText('My thesis')
})

test('invalid imports preserve the library and corrupt data is not overwritten', async ({
  page,
}) => {
  await page.goto('/library')
  await page.locator('input[type=file]').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{broken'),
  })
  await expect(page.getByText('This file is not valid JSON.', { exact: false })).toBeVisible()
  await page.evaluate(() => localStorage.setItem('citeright:library:v1', '{broken'))
  await page.reload()
  await expect(
    page.getByText('Your saved library could not be read.', { exact: false }),
  ).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('citeright:library:v1'))).toBe('{broken')
})

test('rate limit and offline errors keep manual entry available', async ({ page }) => {
  await page.unroute('https://openlibrary.org/**')
  await page.route('https://openlibrary.org/**', (route) =>
    route.fulfill({ status: 429, headers: { 'Retry-After': '60' }, body: '' }),
  )
  await page.goto('/?q=book')
  await expect(page.getByText('Open Library is busy.', { exact: false })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Enter manually', exact: true }).last()).toBeVisible()
})

test('rich copy contains italics and hanging indents, and replacing a draft needs a choice', async ({
  page,
}) => {
  await manualBook(page, 'A book to keep')
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        write: async (items: ClipboardItem[]) => {
          document.body.dataset.copiedHtml = await (await items[0].getType('text/html')).text()
          document.body.dataset.copiedText = await (await items[0].getType('text/plain')).text()
        },
      },
    }),
  )
  await page.getByRole('button', { name: 'Copy citation', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Copied!', exact: true })).toBeVisible()
  expect(await page.locator('body').getAttribute('data-copied-html')).toContain(
    '<i>A book to keep</i>',
  )
  expect(await page.locator('body').getAttribute('data-copied-html')).toContain('text-indent: -2em')
  expect(await page.locator('body').getAttribute('data-copied-text')).toContain('Smith, J. (2021)')
  await page.goto('/?q=Fantastic+Mr.+Fox')
  await page.getByRole('button', { name: /Fantastic Mr. Fox.*Roald Dahl/ }).click()
  await page.getByRole('button', { name: 'Use this edition' }).first().click()
  await expect(page.getByRole('dialog', { name: 'You have an unfinished draft' })).toBeVisible()
  await page.getByRole('button', { name: 'Resume my draft' }).click()
  await expect(page.getByLabel('Book title')).toHaveValue('A book to keep')
})

test('light and dark pages are accessible, responsive, and respect reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  for (const theme of ['light', 'dark']) {
    await page.getByRole('button', { name: 'Color theme' }).click()
    await page.getByRole('menuitemradio', { name: theme, exact: false }).click()
    await page.getByRole('button', { name: 'Color theme' }).click()
    await expect(page.getByRole('menuitemradio', { name: theme, exact: false })).toBeChecked()
    const audit = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(audit.violations).toEqual([])
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Color theme' })).toBeFocused()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    const animationDuration = await page
      .locator('.art-book-yellow')
      .evaluate((element) => getComputedStyle(element).animationDuration)
    expect(animationDuration).toContain('1e-05s')
  }
  await manualBook(page)
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(audit.violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})

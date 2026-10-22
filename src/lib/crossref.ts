import { z } from 'zod'
import DOMPurify from 'dompurify'
import { bookSchema, newBook, normalizeDoi, type Book } from './model'
import { retryDelay } from './open-library'

const dateSchema = z.object({ 'date-parts': z.array(z.array(z.number())).optional() })
const recordSchema = z.object({
  type: z.string(),
  DOI: z.string(),
  title: z.array(z.string()).optional(),
  author: z
    .array(
      z.object({
        given: z.string().optional(),
        family: z.string().optional(),
        name: z.string().optional(),
      }),
    )
    .optional(),
  'container-title': z.array(z.string()).optional(),
  publisher: z.string().optional(),
  editor: z
    .array(
      z.object({
        given: z.string().optional(),
        family: z.string().optional(),
        name: z.string().optional(),
      }),
    )
    .optional(),
  volume: z.string().optional(),
  issue: z.string().optional(),
  page: z.string().optional(),
  'article-number': z.string().optional(),
  'published-print': dateSchema.optional(),
  'published-online': dateSchema.optional(),
  published: dateSchema.optional(),
  issued: dateSchema.optional(),
})

// Crossref titles may contain publisher-supplied XML/HTML. Keep visible text only.
const plainText = (value = '') => {
  const node = document.createElement('div')
  node.innerHTML = DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
  return (node.textContent || '').trim()
}
export function parseDoi(input: string): string {
  let value = input.trim()
  if (/^https?:\/\//i.test(value)) {
    let url: URL
    try {
      url = new URL(value)
    } catch {
      throw new Error('Enter a DOI or a https://doi.org/ link.')
    }
    if (!['doi.org', 'dx.doi.org'].includes(url.hostname.toLowerCase()))
      throw new Error(
        'Use the paper’s DOI, not a Google Scholar or publisher page URL. You can also enter the article manually.',
      )
    try {
      value = decodeURIComponent(url.pathname.slice(1))
    } catch {
      throw new Error('This DOI link is malformed. Copy the DOI from the paper again.')
    }
  }
  const doi = normalizeDoi(value)
  if (doi.length > 500 || !/^10\.\d{4,9}\/\S+$/i.test(doi))
    throw new Error('Enter a DOI such as 10.1037/ppm0000185, or its https://doi.org/ link.')
  return doi.toLowerCase()
}

export function normalizeArticle(input: unknown): Book {
  const item = recordSchema.parse(input)
  if (!['journal-article', 'proceedings-article'].includes(item.type))
    throw new Error(
      `Crossref classifies this DOI as “${item.type}”. DOI lookup supports journal articles and published conference papers. ${['book', 'monograph', 'edited-book'].includes(item.type) ? 'Choose Books to cite this source.' : 'This source type needs a different citation format and is not supported yet.'}`,
    )
  const conference = item.type === 'proceedings-article'
  // Prefer the journal issue's publication date over an earlier online date.
  // Crossref creation/deposit dates are never publication dates.
  const year = [item['published-print'], item.published, item['published-online'], item.issued]
    .map((date) => date?.['date-parts']?.[0]?.[0])
    .find(
      (value) => value !== undefined && Number.isInteger(value) && value >= 1000 && value <= 9999,
    )
  return bookSchema.parse({
    ...newBook(conference ? 'paper-conference' : 'article-journal'),
    title: plainText(item.title?.[0]),
    authors: (item.author || []).map((author) => ({
      given: plainText(author.given),
      family: plainText(author.family),
      literal: author.family || author.given ? '' : plainText(author.name),
    })),
    year: year === undefined ? '' : String(year),
    journal: conference ? '' : plainText(item['container-title']?.[0]),
    proceedings: conference ? plainText(item['container-title']?.[0]) : '',
    publisher: conference ? plainText(item.publisher) : '',
    editors: conference
      ? (item.editor || []).map((editor) => ({
          given: plainText(editor.given),
          family: plainText(editor.family),
          literal: editor.family || editor.given ? '' : plainText(editor.name),
        }))
      : [],
    volume: plainText(item.volume),
    issue: plainText(item.issue),
    pages: plainText(item.page),
    articleNumber: plainText(item['article-number']),
    doi: parseDoi(item.DOI),
    source: {
      imported: true,
      reviewed: false,
      provider: 'crossref',
      catalogUrl: `https://doi.org/${parseDoi(item.DOI)}`,
      publicationDate: year === undefined ? undefined : String(year),
    },
  })
}

const CACHE_KEY = 'citeright:crossref-cache:v1'
const TTL = 24 * 60 * 60 * 1000
const cacheSchema = z
  .array(z.object({ doi: z.string(), at: z.number(), data: recordSchema }))
  .max(100)
let cache: z.infer<typeof cacheSchema> = []
try {
  cache = cacheSchema.parse(JSON.parse(localStorage.getItem(CACHE_KEY) || '[]'))
} catch {
  /* Use memory when unavailable or malformed. */
}
let queue: Promise<unknown> = Promise.resolve()
let nextStart = 0
const pause = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    signal?.throwIfAborted()
    const done = () => {
      signal?.removeEventListener('abort', abort)
      resolve()
    }
    const timer = setTimeout(done, ms)
    const abort = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', abort, { once: true })
  })

export async function lookupArticle(input: string, signal?: AbortSignal): Promise<Book> {
  const doi = parseDoi(input)
  const task = async () => {
    signal?.throwIfAborted()
    const hit = cache.find((entry) => entry.doi === doi && Date.now() - entry.at < TTL)
    if (hit) return normalizeArticle(hit.data)
    for (let attempt = 0; attempt < 3; attempt++) {
      const wait = Math.max(0, nextStart - Date.now())
      if (wait > 15000)
        throw new Error(
          'Crossref asked us to wait. Please try again later, or enter the article manually.',
        )
      await pause(wait, signal)
      signal?.throwIfAborted()
      nextStart = Date.now() + 1100
      const controller = new AbortController()
      const abort = () => controller.abort()
      signal?.addEventListener('abort', abort, { once: true })
      const timeout = setTimeout(abort, 15000)
      try {
        const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        })
        const limit = Number(response.headers.get('x-rate-limit-limit'))
        const interval =
          Number.parseFloat(response.headers.get('x-rate-limit-interval') || '') * 1000
        if (limit > 0 && interval > 0)
          nextStart = Math.max(nextStart, Date.now() + interval / limit)
        if (response.status === 429 || response.status >= 500) {
          const delay = retryDelay(response.headers.get('Retry-After'), attempt)
          nextStart = Math.max(nextStart, Date.now() + delay)
          if (attempt < 2 && delay <= 15000) continue
          throw new Error(
            'Crossref is temporarily busy. Please try again later, or enter the article manually.',
          )
        }
        if (response.status === 404)
          throw new Error(
            'No Crossref record was found for this DOI. Check it on the publisher’s page, or enter the article manually.',
          )
        if (!response.ok)
          throw new Error(
            'Crossref could not return this record. Try again later, or enter the article manually.',
          )
        const payload = z.object({ message: recordSchema }).safeParse(await response.json())
        if (!payload.success)
          throw new Error(
            'Crossref returned incomplete or unsupported metadata. Enter the article manually.',
          )
        const article = normalizeArticle(payload.data.message)
        if (article.doi !== doi)
          throw new Error(
            'Crossref returned a different DOI. Check the publisher’s page before citing this article.',
          )
        cache = [
          ...cache.filter((entry) => entry.doi !== doi && Date.now() - entry.at < TTL),
          { doi, at: Date.now(), data: payload.data.message },
        ].slice(-100)
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
        } catch {
          /* Never evict saved references for metadata. */
        }
        return article
      } catch (error) {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
        if (controller.signal.aborted)
          throw new Error(
            'Crossref took too long to respond. Try again or enter the article manually.',
            { cause: error },
          )
        if (error instanceof TypeError)
          throw new Error(
            'Could not connect to Crossref. Check your connection or enter the article manually.',
            { cause: error },
          )
        if (error instanceof z.ZodError)
          throw new Error(
            'This record exceeds the supported metadata limits. Enter and review the article manually.',
            { cause: error },
          )
        throw error
      } finally {
        clearTimeout(timeout)
        signal?.removeEventListener('abort', abort)
      }
    }
    throw new Error('Crossref is temporarily unavailable.')
  }
  const result = queue.then(task, task)
  queue = result.catch(() => undefined)
  return result
}

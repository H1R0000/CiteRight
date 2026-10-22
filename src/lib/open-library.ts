import { z } from 'zod'
import { newBook, normalizeIsbn, validIsbn, type Author, type Book } from './model'

const API = 'https://openlibrary.org'
const CACHE_KEY = 'citeright:api-cache:v1'
const TTL = 24 * 60 * 60 * 1000
type CacheEntry = { url: string; at: number; data: unknown }
let cache: CacheEntry[] = []
try {
  const parsed: unknown = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]')
  if (Array.isArray(parsed))
    cache = parsed
      .filter(
        (entry): entry is CacheEntry =>
          !!entry &&
          typeof entry.url === 'string' &&
          typeof entry.at === 'number' &&
          'data' in entry,
      )
      .slice(-100)
} catch {
  /* Memory cache is sufficient when storage is unavailable. */
}
let queue: Promise<unknown> = Promise.resolve()
let lastStart = 0
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
export function retryDelay(value: string | null, attempt: number, now = Date.now()): number {
  const seconds = value !== null && /^\d+$/.test(value) ? Number(value) * 1000 : NaN
  const date = value ? Date.parse(value) - now : NaN
  return Math.max(
    1000,
    Number.isFinite(seconds) ? seconds : Number.isFinite(date) ? date : 1500 * 2 ** attempt,
  )
}
async function request(path: string, signal?: AbortSignal): Promise<unknown> {
  const url = `${API}${path}`
  const hit = cache.find((entry) => entry.url === url && Date.now() - entry.at < TTL)
  if (hit) return hit.data
  const task = async () => {
    // Check again after waiting: another request may have populated this URL.
    const queuedHit = cache.find((entry) => entry.url === url && Date.now() - entry.at < TTL)
    if (queuedHit) return queuedHit.data
    for (let attempt = 0; attempt < 3; attempt++) {
      signal?.throwIfAborted()
      await sleep(Math.max(0, 1100 - (Date.now() - lastStart)))
      signal?.throwIfAborted()
      lastStart = Date.now()
      const controller = new AbortController()
      const abort = () => controller.abort()
      signal?.addEventListener('abort', abort, { once: true })
      const timeout = setTimeout(() => controller.abort('timeout'), 15000)
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        })
        if (response.status === 429 || response.status >= 500) {
          const delay = retryDelay(response.headers.get('Retry-After'), attempt)
          if (attempt < 2 && delay <= 15000) {
            await sleep(delay)
            continue
          }
          throw new ApiError(
            response.status === 429
              ? 'Open Library is busy. Please wait a little before trying again, or enter your book manually.'
              : 'Open Library is temporarily unavailable. Try again or enter your book manually.',
            response.status,
          )
        }
        if (!response.ok)
          throw new ApiError(
            response.status === 404
              ? 'This book record could not be found. Try another edition or enter the details manually.'
              : 'We could not retrieve this book. Please try again.',
            response.status,
          )
        const data: unknown = await response.json()
        const urls = [
          ...new Set([url, ...(response.url.startsWith(API + '/') ? [response.url] : [])]),
        ]
        cache = [
          ...cache.filter((entry) => !urls.includes(entry.url) && Date.now() - entry.at < TTL),
          ...urls.map((cacheUrl) => ({ url: cacheUrl, at: Date.now(), data })),
        ].slice(-100)
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
        } catch {
          /* Do not evict the user's library to cache metadata. */
        }
        return data
      } catch (error) {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
        if (error instanceof ApiError) throw error
        throw new ApiError(
          controller.signal.aborted
            ? 'Open Library took too long to respond. Try again or use manual entry.'
            : 'Could not connect to Open Library. Check your connection or enter your book manually.',
        )
      } finally {
        clearTimeout(timeout)
        signal?.removeEventListener('abort', abort)
      }
    }
    throw new ApiError('Open Library is temporarily unavailable.')
  }
  const result = queue.then(task, task)
  queue = result.catch(() => undefined)
  return result
}
const workSchema = z.object({
  key: z.string(),
  title: z.string(),
  author_name: z.array(z.string()).optional(),
  edition_count: z.number().optional(),
  first_publish_year: z.number().optional(),
  cover_i: z.number().optional(),
})
const authorRef = z.union([
  z.object({ key: z.string() }),
  z.object({ author: z.object({ key: z.string() }) }),
])
export const editionSchema = z.object({
  key: z.string(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  publish_date: z.string().optional(),
  publishers: z.array(z.string()).optional(),
  edition_name: z.string().optional(),
  isbn_13: z.array(z.string()).optional(),
  isbn_10: z.array(z.string()).optional(),
  covers: z.array(z.number()).optional(),
  authors: z.array(authorRef).optional(),
  works: z.array(z.object({ key: z.string() })).optional(),
  languages: z.array(z.object({ key: z.string() })).optional(),
  identifiers: z.object({ doi: z.array(z.string()).optional() }).optional(),
})
export type Work = z.infer<typeof workSchema>
export type Edition = z.infer<typeof editionSchema>
export type SearchResult = { works: Work[]; total: number; isbnEdition?: Edition }
export function extractYear(date: string | undefined): string {
  const years = date?.match(/\b[12]\d{3}\b/g) || []
  return new Set(years).size === 1 ? years[0] || '' : ''
}
export function parseAuthor(name: string): Author {
  const cleaned = name.trim()
  if (!cleaned) return { given: '', family: '', literal: '' }
  if (cleaned.includes(',')) {
    const [family, ...given] = cleaned.split(',')
    return { family: family.trim(), given: given.join(',').trim(), literal: '' }
  }
  const parts = cleaned.split(/\s+/)
  if (parts.length === 1) return { given: '', family: '', literal: cleaned }
  return { given: parts.slice(0, -1).join(' '), family: parts.at(-1)!, literal: '' }
}
export function normalizeEdition(edition: Edition, names: string[]): Book {
  const book = newBook()
  return {
    ...book,
    title: [edition.title, edition.subtitle].filter(Boolean).join(': '),
    authors: names.map(parseAuthor),
    year: extractYear(edition.publish_date),
    publisher: edition.publishers?.join('; ') || '',
    edition: edition.edition_name || '',
    isbn: [...(edition.isbn_13 || []), ...(edition.isbn_10 || [])].find(validIsbn) || '',
    doi: edition.identifiers?.doi?.[0] || '',
    coverId: edition.covers?.find((id) => id > 0),
    source: {
      editionKey: edition.key,
      workKey: edition.works?.[0]?.key,
      publicationDate: edition.publish_date,
      catalogUrl: `${API}${edition.key}`,
      imported: true,
      reviewed: false,
      authorsIncomplete:
        names.filter((name) => name.trim()).length < (edition.authors?.length || 0),
    },
  }
}
export async function searchBooks(
  query: string,
  mode: 'all' | 'title' | 'author',
  page = 1,
  signal?: AbortSignal,
): Promise<SearchResult> {
  const isbn = normalizeIsbn(query)
  if (/^[\dX]{10}$|^\d{13}$/.test(isbn)) {
    if (!validIsbn(isbn))
      throw new ApiError('This ISBN does not pass its checksum. Check the numbers on your book.')
    const edition = editionSchema.parse(await request(`/isbn/${isbn}.json`, signal))
    return { works: [], total: 1, isbnEdition: edition }
  }
  const params = new URLSearchParams({
    [mode === 'all' ? 'q' : mode]: query.trim(),
    page: String(page),
    limit: '20',
    fields: 'key,title,author_name,edition_count,first_publish_year,cover_i',
  })
  const parsed = z
    .object({
      docs: z.array(workSchema),
      numFound: z.number().optional(),
      num_found: z.number().optional(),
    })
    .parse(await request(`/search.json?${params}`, signal))
  return { works: parsed.docs, total: parsed.numFound ?? parsed.num_found ?? parsed.docs.length }
}
export async function getEditions(
  workKey: string,
  offset = 0,
  signal?: AbortSignal,
): Promise<{ entries: Edition[]; total: number }> {
  if (!/^\/?works\/OL\d+W$/.test(workKey)) throw new ApiError('Invalid book identifier.')
  const path = workKey.startsWith('/') ? workKey : `/${workKey}`
  const parsed = z
    .object({ entries: z.array(editionSchema), size: z.number().optional() })
    .parse(await request(`${path}/editions.json?limit=12&offset=${offset}`, signal))
  return { entries: parsed.entries, total: parsed.size ?? parsed.entries.length }
}
export async function loadEdition(edition: Edition, signal?: AbortSignal): Promise<Book> {
  if (!/^\/books\/OL\d+M$/.test(edition.key)) throw new ApiError('Invalid edition identifier.')
  const full = editionSchema.parse(await request(`${edition.key}.json`, signal))
  const names: string[] = []
  for (const ref of full.authors || []) {
    const key = 'key' in ref ? ref.key : ref.author.key
    if (!/^\/authors\/OL\d+A$/.test(key)) continue
    try {
      const author = z.object({ name: z.string() }).parse(await request(`${key}.json`, signal))
      names.push(author.name)
    } catch (error) {
      if (signal?.aborted || (error instanceof ApiError && error.status === 429))
        throw error /* Missing author records remain explicitly unavailable. */
    }
  }
  return normalizeEdition(full, names)
}
export const coverUrl = (id: number) =>
  `https://covers.openlibrary.org/b/id/${id}-M.jpg?default=false`

import { z } from 'zod'

export const authorSchema = z.object({
  given: z.string().max(300),
  family: z.string().max(300),
  literal: z.string().max(600),
})
export type Author = z.infer<typeof authorSchema>
export const bookSchema = z.object({
  // Defaults keep pre-article libraries and JSON backups compatible.
  type: z.enum(['book', 'article-journal', 'paper-conference']).default('book'),
  proceedings: z.string().max(2000).default(''),
  editors: z.array(authorSchema).max(100).default([]),
  journal: z.string().max(1000).default(''),
  volume: z.string().max(100).default(''),
  issue: z.string().max(100).default(''),
  pages: z.string().max(100).default(''),
  articleNumber: z.string().max(100).default(''),
  id: z.string().min(1).max(100),
  title: z.string().max(2000),
  authors: z.array(authorSchema).max(100),
  year: z.string().max(30),
  publisher: z.string().max(1000),
  edition: z.string().max(200),
  isbn: z.string().max(100),
  doi: z.string().max(500),
  url: z.string().max(2000),
  coverId: z.number().int().positive().optional(),
  source: z.object({
    editionKey: z.string().max(100).optional(),
    workKey: z.string().max(100).optional(),
    publicationDate: z.string().max(200).optional(),
    catalogUrl: z.string().max(500).optional(),
    imported: z.boolean(),
    reviewed: z.boolean(),
    authorsIncomplete: z.boolean().optional(),
    provider: z.enum(['open-library', 'crossref']).optional(),
  }),
  collectionIds: z.array(z.string().max(100)).max(100),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type Book = z.infer<typeof bookSchema>
export const savedBookSchema = bookSchema.refine(
  (book) => !!book.title.trim(),
  'Every reference needs a title.',
)
export const collectionSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(80),
})
export type Collection = z.infer<typeof collectionSchema>
export const librarySchema = z.object({
  version: z.literal(1),
  references: z.array(savedBookSchema).max(5000),
  collections: z.array(collectionSchema).max(100),
})
export type Library = z.infer<typeof librarySchema>
export type CitationStyle = 'apa' | 'mla'
export type Theme = 'system' | 'light' | 'dark'
export type Issue = { field: string; message: string; severity: 'error' | 'warning' }
export const blankAuthor = (): Author => ({ given: '', family: '', literal: '' })
export function newBook(type: Book['type'] = 'book'): Book {
  const now = new Date().toISOString()
  return {
    type,
    proceedings: '',
    editors: [],
    journal: '',
    volume: '',
    issue: '',
    pages: '',
    articleNumber: '',
    id: crypto.randomUUID(),
    title: '',
    authors: [blankAuthor()],
    year: '',
    publisher: '',
    edition: '',
    isbn: '',
    doi: '',
    url: '',
    source: { imported: false, reviewed: true },
    collectionIds: [],
    createdAt: now,
    updatedAt: now,
  }
}
export const emptyLibrary = (): Library => ({ version: 1, references: [], collections: [] })
export const authorName = (author: Author) =>
  author.literal || [author.given, author.family].filter(Boolean).join(' ')
export const bookAuthors = (book: Book) =>
  book.authors.map(authorName).filter(Boolean).join(', ') || 'Author unavailable'
export const normalizeIsbn = (isbn: string) => isbn.replace(/[\s-]/g, '').toUpperCase()
export const normalizeDoi = (doi: string) =>
  doi.trim().replace(/^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)/i, '')
export function validIsbn(raw: string): boolean {
  const isbn = normalizeIsbn(raw)
  if (/^\d{9}[\dX]$/.test(isbn))
    return (
      [...isbn].reduce(
        (sum, char, index) => sum + (char === 'X' ? 10 : Number(char)) * (10 - index),
        0,
      ) %
        11 ===
      0
    )
  if (/^97[89]\d{10}$/.test(isbn))
    return (
      [...isbn].reduce((sum, char, index) => sum + Number(char) * (index % 2 ? 3 : 1), 0) % 10 === 0
    )
  return false
}
export function canonicalIsbn(raw: string): string {
  const isbn = normalizeIsbn(raw)
  if (isbn.length !== 10 || !validIsbn(isbn)) return isbn
  const base = `978${isbn.slice(0, 9)}`
  const sum = [...base].reduce(
    (total, char, index) => total + Number(char) * (index % 2 ? 3 : 1),
    0,
  )
  return base + ((10 - (sum % 10)) % 10)
}
export function safeUrl(value: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}
export function issuesFor(book: Book): Issue[] {
  const issues: Issue[] = []
  if (
    book.source.imported &&
    !book.source.reviewed &&
    book.authors.some((a) => !a.literal && /^\p{L}\.?$/u.test(a.family.trim()))
  )
    issues.push({
      field: 'authors',
      severity: 'warning',
      message:
        'An imported family name contains only one letter. The citation will use that letter as the surname. Check the publisher’s author list or citation export before confirming; initials may be intentional.',
    })
  if (book.source.authorsIncomplete)
    issues.push({
      field: 'authors',
      message:
        'Some author records could not be loaded. Check the full author list against your source before marking it reviewed.',
      severity: 'warning',
    })
  if (!book.title.trim())
    issues.push({ field: 'title', message: 'Add a title.', severity: 'error' })
  if (!book.authors.some((a) => authorName(a).trim()))
    issues.push({
      field: 'authors',
      message: 'Author unavailable. The title will take its place.',
      severity: 'warning',
    })
  if (!book.year.trim())
    issues.push({
      field: 'year',
      message: 'Publication year unavailable. Check your source.',
      severity: 'warning',
    })
  else if (!/^\d{4}$/.test(book.year) || Number(book.year) === 0)
    issues.push({
      field: 'year',
      message: 'Use a four-digit publication year, or leave it blank.',
      severity: 'error',
    })
  if (book.type !== 'article-journal' && !book.publisher.trim())
    issues.push({
      field: 'publisher',
      message: 'Publisher unavailable. Check the copyright page.',
      severity: 'warning',
    })
  if (book.type === 'article-journal') {
    if (!book.journal.trim())
      issues.push({
        field: 'journal',
        message: 'Journal name unavailable. Check the published article.',
        severity: 'warning',
      })
    if (!book.pages.trim() && !book.articleNumber.trim())
      issues.push({
        field: 'pages',
        message:
          'Page range or article number unavailable. Leave blank if the journal does not assign one.',
        severity: 'warning',
      })
  }
  if (book.type === 'paper-conference' && !book.proceedings.trim())
    issues.push({
      field: 'proceedings',
      message:
        'Proceedings title unavailable. Check the published conference paper; this editor supports papers published in proceedings, not unpublished presentations.',
      severity: 'warning',
    })
  if (book.type === 'book' && book.isbn.trim() && !validIsbn(book.isbn))
    issues.push({
      field: 'isbn',
      message: 'This ISBN does not pass its checksum. Correct it or leave it blank.',
      severity: 'error',
    })
  if (book.doi.trim() && !/^10\.\d{4,9}\/\S+$/i.test(normalizeDoi(book.doi)))
    issues.push({
      field: 'doi',
      message: 'Enter a DOI such as 10.1037/0000168-000, or leave it blank.',
      severity: 'error',
    })
  if (book.url.trim() && !safeUrl(book.url))
    issues.push({
      field: 'url',
      message: 'Use a complete http:// or https:// URL.',
      severity: 'error',
    })
  if (book.source.imported && !book.source.reviewed)
    issues.push({
      field: 'authors',
      message: 'Review imported names, title capitalization, and publication details.',
      severity: 'warning',
    })
  return issues
}
const normalized = (value: string) =>
  value
    .normalize('NFKC')
    .toLocaleLowerCase('en')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
export function findDuplicate(
  book: Book,
  references: Book[],
): { book: Book; exact: boolean } | undefined {
  for (const candidate of references) {
    if (candidate.id === book.id) continue
    if (book.type !== candidate.type) continue
    if (
      book.type === 'book' &&
      book.isbn &&
      candidate.isbn &&
      canonicalIsbn(book.isbn) === canonicalIsbn(candidate.isbn)
    )
      return { book: candidate, exact: true }
    if (
      book.doi &&
      candidate.doi &&
      normalizeDoi(book.doi).toLowerCase() === normalizeDoi(candidate.doi).toLowerCase()
    )
      return { book: candidate, exact: true }
    if (book.source.editionKey && candidate.source.editionKey === book.source.editionKey)
      return { book: candidate, exact: true }
    // Distinct known editions must never be collapsed just because their titles match.
    if (
      book.source.editionKey &&
      candidate.source.editionKey &&
      book.source.editionKey !== candidate.source.editionKey
    )
      continue
    if (
      book.type === 'book' &&
      book.isbn &&
      candidate.isbn &&
      canonicalIsbn(book.isbn) !== canonicalIsbn(candidate.isbn)
    )
      continue
    if (
      book.type !== 'book' &&
      book.doi &&
      candidate.doi &&
      normalizeDoi(book.doi).toLowerCase() !== normalizeDoi(candidate.doi).toLowerCase()
    )
      continue
    const fingerprint = (entry: Book) =>
      [
        entry.title,
        bookAuthors(entry),
        entry.year,
        ...(entry.type === 'paper-conference'
          ? [entry.proceedings, entry.publisher, entry.volume, entry.pages]
          : entry.type === 'article-journal'
            ? [entry.journal, entry.volume, entry.issue, entry.pages, entry.articleNumber]
            : [entry.edition, entry.publisher]),
      ]
        .map(normalized)
        .join('|')
    if (fingerprint(book) === fingerprint(candidate)) return { book: candidate, exact: false }
  }
}

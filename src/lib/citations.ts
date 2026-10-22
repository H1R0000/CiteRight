import { Cite, plugins, type CSL } from '@citation-js/core'
import '@citation-js/plugin-csl'
import '@citation-js/plugin-bibtex'
import DOMPurify from 'dompurify'
import apa from '../assets/csl/apa.csl?raw'
import mla from '../assets/csl/mla.csl?raw'
import locale from '../assets/csl/en-US.xml?raw'
import { authorName, normalizeDoi, normalizeIsbn, type Book, type CitationStyle } from './model'

interface CslEngine {
  updateItems(ids: string[]): string[]
  makeCitationCluster(items: { id: string; locator?: string; label?: string }[]): string
}
interface CslConfig {
  styles: { add(id: string, xml: string): void }
  locales: { add(id: string, xml: string): void }
  engine(data: CSL[], style: string, locale: string, format: string): CslEngine
}
const config = plugins.config.get('@csl') as CslConfig
config.styles.add('citeright-apa7', apa)
config.styles.add('citeright-mla9', mla)
config.locales.add('en-US', locale)
const styleName = (style: CitationStyle) => (style === 'apa' ? 'citeright-apa7' : 'citeright-mla9')
const plainMetadata = (text: string) => text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
export function toCSL(book: Book, escapeMarkup = false): CSL {
  const clean = (value: string) => (escapeMarkup ? plainMetadata(value.trim()) : value.trim())
  const edition = book.edition
    .trim()
    .replace(/^(\d+)(?:st|nd|rd|th)?(?:\s+(?:ed\.?|edition))?$/i, '$1')
  return {
    id: book.id,
    type: book.type,
    title: clean(book.title),
    author: book.authors
      .filter((a) => authorName(a).trim())
      .map((a) =>
        a.literal.trim()
          ? { literal: clean(a.literal) }
          : { given: clean(a.given), family: clean(a.family) },
      ),
    ...(book.year && /^\d{4}$/.test(book.year)
      ? { issued: { 'date-parts': [[Number(book.year)]] } }
      : {}),
    ...(book.type === 'article-journal'
      ? {
          ...(book.journal.trim() ? { 'container-title': clean(book.journal) } : {}),
          ...(book.volume.trim() ? { volume: clean(book.volume) } : {}),
          ...(book.issue.trim() ? { issue: clean(book.issue) } : {}),
          ...(book.pages.trim() ? { page: clean(book.pages).replace(/–/g, '-') } : {}),
          ...(book.articleNumber.trim() ? { number: clean(book.articleNumber) } : {}),
        }
      : book.type === 'paper-conference'
        ? {
            ...(book.proceedings.trim() ? { 'container-title': clean(book.proceedings) } : {}),
            ...(book.publisher.trim() ? { publisher: clean(book.publisher) } : {}),
            ...(book.volume.trim() ? { volume: clean(book.volume) } : {}),
            ...(book.pages.trim() ? { page: clean(book.pages).replace(/–/g, '-') } : {}),
            editor: book.editors
              .filter((person) => authorName(person).trim())
              .map((person) =>
                person.literal.trim()
                  ? { literal: clean(person.literal) }
                  : { given: clean(person.given), family: clean(person.family) },
              ),
          }
        : {
            ...(book.publisher.trim() ? { publisher: clean(book.publisher) } : {}),
            ...(edition ? { edition: clean(edition) } : {}),
            ...(book.isbn ? { ISBN: normalizeIsbn(book.isbn) } : {}),
          }),
    ...(book.doi.trim() ? { DOI: normalizeDoi(book.doi) } : {}),
    ...(book.url.trim() ? { URL: book.url.trim() } : {}),
    language: 'en-US',
  }
}
export const sanitizeCitation = (html: string): string =>
  DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['div', 'span', 'i', 'em', 'b', 'strong', 'sup', 'sub', 'a'],
    ALLOWED_ATTR: ['class', 'href'],
    ALLOW_DATA_ATTR: false,
  })
export type Formatted = { html: string; text: string }
export type Bibliography = Formatted & { entries: (Formatted & { id: string })[] }
function cslForCitation(book: Book): CSL {
  const data = toCSL(book, true)
  // Our conference type means a paper in published proceedings, which APA/MLA
  // treat as a collected-work contribution. Their CSL otherwise infers a serial from
  // paper-conference when editors are absent, omitting the known publisher.
  // Keep paper-conference in the stored model and BibTeX export.
  return book.type === 'paper-conference' ? { ...data, type: 'chapter' } : data
}
export function formatBibliography(books: Book[], style: CitationStyle): Bibliography {
  if (!books.length) return { html: '', text: '', entries: [] }
  const cite = new Cite(books.map(cslForCitation))
  const options = { template: styleName(style), lang: 'en-US', asEntryArray: true as const }
  const html = cite.format('bibliography', { ...options, format: 'html' }) as [string, string][]
  const text = cite.format('bibliography', { ...options, format: 'text' }) as [string, string][]
  const plain = new Map(text.map(([id, value]) => [String(id), value.trim()]))
  const entries = html.map(([id, value]) => ({
    id: String(id),
    html: sanitizeCitation(value),
    text: plain.get(String(id)) || '',
  }))
  return {
    html: `<div class="csl-bib-body">${entries.map((entry) => entry.html).join('')}</div>`,
    text: entries.map((entry) => entry.text).join('\n\n'),
    entries,
  }
}
export function formatInText(
  book: Book,
  style: CitationStyle,
  locator = '',
  context: Book[] = [book],
): Formatted {
  const books = [...context.filter((item) => item.id !== book.id), book]
  const data = books.map(cslForCitation)
  const render = (format: string) => {
    const engine = config.engine(data, styleName(style), 'en-US', format)
    engine.updateItems(books.map((item) => item.id))
    return engine.makeCitationCluster([
      {
        id: book.id,
        ...(locator.trim() ? { locator: locator.trim().replace(/–/g, '-'), label: 'page' } : {}),
      },
    ])
  }
  return { html: sanitizeCitation(render('html')), text: render('text') }
}
export function exportBibtex(books: Book[]): string {
  const entries = books.map((book, index) => ({
    ...toCSL(book),
    'citation-key': `ref${index + 1}_${book.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)}`,
  }))
  return new Cite(entries).format('bibtex') as string
}

import { describe, expect, it } from 'vitest'
import { crossrefArticle, sampleArticle } from '../test/article-fixtures'
import { normalizeArticle, parseDoi } from './crossref'
import { bookSchema, findDuplicate, issuesFor } from './model'
import { sampleBook } from '../test/fixtures'
import { exportBibtex, formatBibliography, formatInText, toCSL } from './citations'
import { mergeImport, parseImport, serializeLibrary } from './transfer'

describe('journal article metadata and compatibility', () => {
  it('accepts raw/prefixed DOIs and DOI URLs, and rejects Scholar links', () => {
    expect(parseDoi(' DOI: 10.1037/PPM0000185 ')).toBe('10.1037/ppm0000185')
    expect(parseDoi('https://doi.org/10.1037%2Fppm0000185?via=scholar')).toBe('10.1037/ppm0000185')
    expect(() => parseDoi('https://scholar.google.com/scholar?q=paper')).toThrow(
      'not a Google Scholar',
    )
    expect(() => parseDoi('a paper title')).toThrow('Enter a DOI')
  })
  it('uses journal publication dates and ordered authors, never deposit dates', () => {
    const book = normalizeArticle(crossrefArticle)
    expect(book).toMatchObject({
      type: 'article-journal',
      year: '2019',
      volume: '8',
      issue: '3',
      pages: '207-217',
      publisher: '',
      isbn: '',
      url: '',
    })
    expect(book.authors[0]).toEqual({ given: 'J. S.', family: 'Grady', literal: '' })
    expect(book.source).toMatchObject({ provider: 'crossref', imported: true, reviewed: false })
    const missing = normalizeArticle({
      type: 'journal-article',
      DOI: '10.1234/missing',
      created: { 'date-parts': [[2026]] },
    })
    expect(missing.year).toBe('')
    expect(missing.journal).toBe('')
    expect(missing.authors).toEqual([])
    expect(issuesFor(missing).some((issue) => issue.field === 'publisher')).toBe(false)
  })
  it('rejects other source types and strips publisher markup', () => {
    expect(() => normalizeArticle({ ...crossrefArticle, type: 'posted-content' })).toThrow(
      'Crossref classifies this DOI as “posted-content”',
    )
    const article = normalizeArticle({
      ...crossrefArticle,
      title: ['A <i>study</i> &amp; review<script>alert(1)</script>'],
      author: [{ name: 'Research Group' }],
    })
    expect(article.title).toBe('A study & review')
    expect(article.authors[0].literal).toBe('Research Group')
  })
  it('loads legacy records as books and round-trips mixed JSON without losing article fields', () => {
    const old = JSON.parse(JSON.stringify(sampleBook())) as Record<string, unknown>
    for (const field of ['type', 'journal', 'volume', 'issue', 'pages', 'articleNumber'])
      delete old[field]
    expect(bookSchema.parse(old).type).toBe('book')
    const library = parseImport(
      JSON.stringify({ version: 1, references: [old, sampleArticle()], collections: [] }),
    )
    expect(parseImport(serializeLibrary(library))).toEqual(library)
    expect(mergeImport(library, library)).toMatchObject({ added: 0, skipped: 2 })
  })
  it('deduplicates article DOIs but keeps distinct DOI records and source types', () => {
    const existing = sampleArticle()
    expect(
      findDuplicate(sampleArticle({ id: 'new', doi: 'https://doi.org/10.1037/PPM0000185' }), [
        existing,
      ])?.exact,
    ).toBe(true)
    expect(
      findDuplicate(sampleArticle({ id: 'new', doi: '10.1234/another' }), [existing]),
    ).toBeUndefined()
    expect(findDuplicate(sampleArticle({ id: 'new', type: 'book' }), [existing])).toBeUndefined()
  })
})

describe('verified article citation formatting', () => {
  it('matches APA’s Grady example with journal/volume italics and separate quotation pages', () => {
    const article = sampleArticle()
    const result = formatBibliography([article], 'apa')
    expect(result.text).toBe(
      'Grady, J. S., Her, M., Moreno, G., Perez, C., & Yelinek, J. (2019). Emotions in storybooks: A comparison of storybooks that represent ethnic and racial groups in the United States. Psychology of Popular Media Culture, 8(3), 207–217. https://doi.org/10.1037/ppm0000185',
    )
    expect(result.html).toContain('<i>Psychology of Popular Media Culture</i>')
    expect(result.html).toContain('<i>8</i>')
    expect(result.html).not.toContain(`<i>${article.title}</i>`)
    expect(formatInText(article, 'apa', '210').text).toBe('(Grady et al., 2019, p. 210)')
  })
  it('matches MLA’s Berman example including page range and DOI', () => {
    // https://style.mla.org/page-range-and-doi/ (MLA 9 guidance)
    const article = sampleArticle({
      title: 'The Necessity of Language Learning',
      authors: [{ given: 'Russell', family: 'Berman', literal: '' }],
      journal: 'ADFL Bulletin',
      volume: '43',
      issue: '2',
      year: '2015',
      pages: '11-14',
      doi: '10.1632/adfl.43.2.11',
    })
    expect(formatBibliography([article], 'mla').text).toBe(
      'Berman, Russell. “The Necessity of Language Learning.” ADFL Bulletin, vol. 43, no. 2, 2015, pp. 11–14, https://doi.org/10.1632/adfl.43.2.11.',
    )
    expect(formatBibliography([article], 'mla').html).toContain('<i>ADFL Bulletin</i>')
    expect(formatInText(article, 'mla', '12').text).toBe('(Berman 12)')
  })
  it('formats article numbers and leaves absent volume/issue/pages out', () => {
    const article = sampleArticle({
      title: 'Environmental physiology and diving medicine',
      authors: [
        { given: 'G.', family: 'Bosco', literal: '' },
        { given: 'G.', family: 'Rizzato', literal: '' },
        { given: 'R. E.', family: 'Moon', literal: '' },
        { given: 'E. M.', family: 'Camporesi', literal: '' },
      ],
      year: '2018',
      journal: 'Frontiers in Psychology',
      volume: '9',
      issue: '',
      pages: '',
      articleNumber: '72',
      doi: '10.3389/fpsyg.2018.00072',
    })
    expect(formatBibliography([article], 'apa').text).toBe(
      'Bosco, G., Rizzato, G., Moon, R. E., & Camporesi, E. M. (2018). Environmental physiology and diving medicine. Frontiers in Psychology, 9, Article 72. https://doi.org/10.3389/fpsyg.2018.00072',
    )
    const missing = toCSL(
      sampleArticle({
        volume: '',
        issue: '',
        pages: '',
        publisher: 'Ignored for articles',
        edition: '2',
        isbn: '0140328726',
      }),
    )
    expect(missing.volume).toBeUndefined()
    expect(missing.publisher).toBeUndefined()
    expect(missing.edition).toBeUndefined()
    expect(missing.ISBN).toBeUndefined()
  })
  it('exports article BibTeX and sorts mixed reference lists', () => {
    const bib = exportBibtex([sampleArticle()])
    expect(bib).toMatch(/@article\{/i)
    expect(bib).toContain('Psychology of Popular Media Culture')
    expect(bib).toContain('207--217')
    expect(formatBibliography([sampleBook(), sampleArticle()], 'apa').entries[0].id).toBe(
      'article-example',
    )
  })
})

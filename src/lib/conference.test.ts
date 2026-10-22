import { describe, expect, it } from 'vitest'
import { crossrefConference } from '../test/article-fixtures'
import { normalizeArticle } from './crossref'
import { exportBibtex, formatBibliography, formatInText, toCSL } from './citations'
import { findDuplicate, issuesFor } from './model'
import { parseImport, serializeLibrary } from './transfer'

describe('published conference papers', () => {
  it('accepts the user-reported IEEE DOI as proceedings, preserving names and publication fields', () => {
    const paper = normalizeArticle(crossrefConference)
    expect(paper).toMatchObject({
      type: 'paper-conference',
      publisher: 'IEEE',
      pages: '141-148',
      year: '2025',
      journal: '',
      proceedings: crossrefConference['container-title'][0],
    })
    expect(paper.authors[0]).toEqual({ given: 'Adline Freeda', family: 'R', literal: '' })
    expect(toCSL(paper)).toMatchObject({
      type: 'paper-conference',
      publisher: 'IEEE',
      'container-title': paper.proceedings,
      page: '141-148',
    })
    expect(issuesFor(paper).some((issue) => issue.field === 'journal')).toBe(false)
    expect(formatBibliography([paper], 'apa').text).toContain('(2025).')
    expect(formatBibliography([paper], 'apa').text).toContain('(pp. 141–148). IEEE.')
    expect(formatBibliography([paper], 'mla').text).toContain('IEEE, 2025, pp. 141–48')
    expect(formatInText(paper, 'apa', '144').text).toBe('(R et al., 2025, p. 144)')
    expect(formatInText(paper, 'mla', '144').text).toBe('(R et al. 144)')
  })
  it('formats the APA published proceedings example with editors and pages', () => {
    // APA's official Bedenel example: conference-proceeding-references, example 3.
    const paper = normalizeArticle({
      type: 'proceedings-article',
      DOI: '10.1007/978-3-030-05348-2_21',
      title: ['Probability estimation by an adapted genetic algorithm in web insurance'],
      author: [
        { given: 'A.-L.', family: 'Bedenel' },
        { given: 'L.', family: 'Jourdan' },
        { given: 'C.', family: 'Biernacki' },
      ],
      editor: [
        { given: 'R.', family: 'Battiti' },
        { given: 'M.', family: 'Brunato' },
        { given: 'I.', family: 'Kotsireas' },
        { given: 'P.', family: 'Pardalos' },
      ],
      'container-title': [
        'Lecture notes in computer science: Vol. 11353. Learning and intelligent optimization',
      ],
      publisher: 'Springer',
      page: '225-240',
      published: { 'date-parts': [[2019]] },
    })
    expect(formatBibliography([paper], 'apa').text).toBe(
      'Bedenel, A.-L., Jourdan, L., & Biernacki, C. (2019). Probability estimation by an adapted genetic algorithm in web insurance. In R. Battiti, M. Brunato, I. Kotsireas, & P. Pardalos (Eds.), Lecture notes in computer science: Vol. 11353. Learning and intelligent optimization (pp. 225–240). Springer. https://doi.org/10.1007/978-3-030-05348-2_21',
    )
  })
  it('exports and imports conference metadata and prevents duplicate DOIs', () => {
    const paper = normalizeArticle(crossrefConference)
    expect(exportBibtex([paper])).toMatch(/@inproceedings\{/i)
    expect(exportBibtex([paper])).toContain('IEEE')
    expect(exportBibtex([paper])).toContain('141--148')
    const library = { version: 1 as const, references: [paper], collections: [] }
    expect(parseImport(serializeLibrary(library))).toEqual(library)
    expect(
      findDuplicate({ ...paper, id: 'new', doi: paper.doi.toUpperCase() }, [paper])?.exact,
    ).toBe(true)
    const missing = normalizeArticle({ type: 'proceedings-article', DOI: '10.1234/minimal' })
    expect(missing.year).toBe('')
    expect(missing.publisher).toBe('')
    expect(issuesFor(missing).some((issue) => issue.field === 'proceedings')).toBe(true)
  })
})

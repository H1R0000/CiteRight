import { describe, expect, it } from 'vitest'
import { exportBibtex, formatBibliography, formatInText, toCSL } from './citations'
import { mantel, sampleBook } from '../test/fixtures'
import { newBook } from './model'
// Expected strings are transcribed from independently published examples, not generated snapshots.
// APA: https://apastyle.apa.org/style-grammar-guidelines/references/examples/book-references
// MLA: https://style.mla.org/works-cited/citations-by-format/
describe('official APA 7 / MLA 9 examples', () => {
  it('matches the APA Sapolsky example, including italics', () => {
    const result = formatBibliography([sampleBook()], 'apa')
    expect(result.text).toBe(
      'Sapolsky, R. M. (2017). Behave: The biology of humans at our best and worst. Penguin Books.',
    )
    expect(result.html).toContain('<i>Behave: The biology of humans at our best and worst</i>')
    expect(formatInText(sampleBook(), 'apa').text).toBe('(Sapolsky, 2017)')
    expect(formatInText(sampleBook(), 'apa', '24-28').text).toBe('(Sapolsky, 2017, pp. 24–28)')
  })
  it('matches APA edition and DOI formatting', () => {
    const book = sampleBook({
      title: 'The psychology of prejudice: From attitudes to social action',
      authors: [{ given: 'L. M.', family: 'Jackson', literal: '' }],
      year: '2019',
      edition: '2nd ed.',
      publisher: 'American Psychological Association',
      doi: '10.1037/0000168-000',
    })
    expect(formatBibliography([book], 'apa').text).toBe(
      'Jackson, L. M. (2019). The psychology of prejudice: From attitudes to social action (2nd ed.). American Psychological Association. https://doi.org/10.1037/0000168-000',
    )
  })
  it('matches the MLA Mantel example and page locator conventions', () => {
    const result = formatBibliography([mantel()], 'mla')
    expect(result.text).toBe('Mantel, Hilary. Wolf Hall. Picador, 2010.')
    expect(result.html).toContain('<i>Wolf Hall</i>')
    expect(formatInText(mantel(), 'mla').text).toBe('(Mantel)')
    expect(formatInText(mantel(), 'mla', '24').text).toBe('(Mantel 24)')
    expect(formatInText(mantel(), 'mla', '124-128').text).toBe('(Mantel 124–28)')
  })
  it('handles multiple authors and corporate names with CSL', () => {
    const book = sampleBook({
      authors: [
        { given: 'S.', family: 'Svendsen', literal: '' },
        { given: 'L.', family: 'Løber', literal: '' },
      ],
      year: '2020',
    })
    expect(formatInText(book, 'apa').text).toBe('(Svendsen & Løber, 2020)')
    const organization = sampleBook({
      authors: [{ given: '', family: '', literal: 'World Health Organization' }],
    })
    expect(formatInText(organization, 'apa').text).toBe('(World Health Organization, 2017)')
  })
  it('applies missing-data rules without fabricating dates or authors', () => {
    const book = { ...newBook(), title: 'An uncredited book', authors: [] }
    expect(toCSL(book).issued).toBeUndefined()
    expect(formatBibliography([book], 'apa').text).toBe('An uncredited book. (n.d.).')
    expect(formatBibliography([book], 'mla').text).toBe('An Uncredited Book.')
  })
  it('sorts a bibliography and disambiguates same-author/year works consistently', () => {
    const books = [
      sampleBook({ id: 'z', title: 'Zebra behavior' }),
      sampleBook({ id: 'a', title: 'Animal behavior' }),
      mantel(),
    ]
    const result = formatBibliography(books, 'apa')
    expect(result.entries.map((entry) => entry.id)).toEqual(['mantel-2010', 'a', 'z'])
    expect(result.entries[1].text).toContain('(2017a)')
    expect(formatInText(books[1], 'apa', '', books).text).toBe('(Sapolsky, 2017a)')
  })
  it('keeps malicious metadata inert and exports escaped BibTeX', () => {
    const book = sampleBook({ title: '<img src=x onerror=alert(1)> A & B' })
    const result = formatBibliography([book], 'apa')
    const element = document.createElement('div')
    element.innerHTML = result.html
    expect(element.querySelector('img,script')).toBeNull()
    expect(element.textContent).toContain('A & B')
    expect(exportBibtex([sampleBook({ title: 'Research & development' })])).toContain('\\&')
  })
})

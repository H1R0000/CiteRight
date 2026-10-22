import { describe, expect, it } from 'vitest'
import { extractYear, normalizeEdition, parseAuthor, retryDelay } from './open-library'
import { issuesFor } from './model'
describe('edition normalization', () => {
  it('explicitly warns when only part of the author list was retrieved', () => {
    const book = normalizeEdition(
      {
        key: '/books/OL1M',
        title: 'A title',
        authors: [{ key: '/authors/OL1A' }, { key: '/authors/OL2A' }],
      },
      ['Mary Smith'],
    )
    expect(book.source.authorsIncomplete).toBe(true)
    expect(issuesFor(book).some((issue) => issue.message.startsWith('Some author records'))).toBe(
      true,
    )
    expect(book.authors).toHaveLength(1)
  })
  it('uses publication fields from the chosen edition and never fills missing ones', () => {
    const first = normalizeEdition(
      {
        key: '/books/OL1M',
        title: 'A title',
        publish_date: 'May 1999',
        publishers: ['First Press'],
        isbn_13: ['9780140328721'],
        edition_name: '1st ed.',
      },
      ['Mary Smith'],
    )
    const second = normalizeEdition(
      { key: '/books/OL2M', title: 'A title', publish_date: '2010', edition_name: '2nd ed.' },
      [],
    )
    expect(first.year).toBe('1999')
    expect(first.publisher).toBe('First Press')
    expect(second.year).toBe('2010')
    expect(second.publisher).toBe('')
    expect(second.isbn).toBe('')
    expect(second.authors).toEqual([])
    expect(second.source.editionKey).toBe('/books/OL2M')
    expect(second.url).toBe('')
  })
  it('leaves ambiguous publication years blank', () => {
    expect(extractYear('1999–2001')).toBe('')
    expect(extractYear('Published September 2007')).toBe('2007')
    expect(extractYear('unknown')).toBe('')
    expect(extractYear(undefined)).toBe('')
  })
  it('preserves literal names, accents, and names needing review', () => {
    expect(parseAuthor('Plato')).toEqual({ given: '', family: '', literal: 'Plato' })
    expect(parseAuthor('García Márquez, Gabriel')).toEqual({
      family: 'García Márquez',
      given: 'Gabriel',
      literal: '',
    })
    expect(normalizeEdition({ key: '/books/OL1M' }, ['A. B. Author']).source.reviewed).toBe(false)
  })
  it('filters invalid covers and ISBNs without inventing replacements', () => {
    const book = normalizeEdition({ key: '/books/OL1M', covers: [-1, 123], isbn_13: ['bad'] }, [])
    expect(book.coverId).toBe(123)
    expect(book.isbn).toBe('')
  })
  it('honors both Retry-After formats and uses bounded-attempt backoff otherwise', () => {
    expect(retryDelay('12', 0)).toBe(12000)
    expect(retryDelay('Thu, 22 Oct 2026 12:00:10 GMT', 0, Date.parse('2026-10-22T12:00:00Z'))).toBe(
      10000,
    )
    expect(retryDelay(null, 1)).toBe(3000)
  })
})

import { describe, expect, it } from 'vitest'
import { canonicalIsbn, findDuplicate, issuesFor, newBook, normalizeDoi, validIsbn } from './model'
import { sampleBook } from '../test/fixtures'
describe('validation and identity', () => {
  it('flags ambiguous imported surnames without changing metadata or rejecting initials', () => {
    const book = newBook()
    book.source = { imported: true, reviewed: false }
    book.authors = [{ given: 'Adline Freeda', family: 'R', literal: '' }]
    expect(issuesFor(book).some((issue) => issue.message.includes('one letter'))).toBe(true)
    expect(book.authors[0].family).toBe('R')
    book.source.reviewed = true
    expect(issuesFor(book).some((issue) => issue.message.includes('one letter'))).toBe(false)
  })
  it('checks ISBN-10 and ISBN-13 checksums, including X', () => {
    expect(validIsbn('0-14-032872-6')).toBe(true)
    expect(validIsbn('9780140328721')).toBe(true)
    expect(validIsbn('080442957X')).toBe(true)
    expect(validIsbn('9780140328722')).toBe(false)
    expect(validIsbn('978abcdefghij')).toBe(false)
    expect(canonicalIsbn('0140328726')).toBe('9780140328721')
  })
  it('requires a title but allows genuinely unavailable facts', () => {
    const book = newBook()
    expect(issuesFor(book).filter((issue) => issue.severity === 'error')).toHaveLength(1)
    book.title = 'A book without metadata'
    expect(issuesFor(book).filter((issue) => issue.severity === 'error')).toHaveLength(0)
    expect(issuesFor(book).filter((issue) => issue.severity === 'warning')).toHaveLength(3)
  })
  it('rejects unsafe URLs and malformed supplied metadata', () => {
    const issues = issuesFor(
      sampleBook({ url: 'javascript:alert(1)', year: '20xx', doi: 'not-a-doi', isbn: '123' }),
    )
    expect(
      issues.filter((issue) => issue.severity === 'error').map((issue) => issue.field),
    ).toEqual(['year', 'isbn', 'doi', 'url'])
    expect(normalizeDoi('https://doi.org/10.1037/0000168-000')).toBe('10.1037/0000168-000')
  })
  it('detects the same ISBN in either form, without collapsing distinct editions', () => {
    const original = sampleBook({
      id: 'one',
      isbn: '0140328726',
      source: { editionKey: '/books/OL1M', imported: true, reviewed: true },
    })
    expect(findDuplicate(sampleBook({ id: 'two', isbn: '9780140328721' }), [original])?.exact).toBe(
      true,
    )
    expect(
      findDuplicate(
        sampleBook({
          id: 'two',
          source: { editionKey: '/books/OL2M', imported: true, reviewed: true },
        }),
        [original],
      ),
    ).toBeUndefined()
    expect(findDuplicate(original, [original])).toBeUndefined()
  })
  it('uses bibliographic matching only for possible duplicates', () => {
    expect(
      findDuplicate(
        sampleBook({ id: 'new', title: 'BEHAVE: the biology of humans at our best and worst' }),
        [sampleBook()],
      )?.exact,
    ).toBe(false)
    expect(
      findDuplicate(sampleBook({ id: 'new', year: '2020', edition: '2' }), [sampleBook()]),
    ).toBeUndefined()
  })
})

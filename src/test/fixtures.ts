import { newBook, type Book } from '../lib/model'
export function sampleBook(overrides: Partial<Book> = {}): Book {
  return {
    ...newBook(),
    id: 'sapolsky-2017',
    title: 'Behave: The biology of humans at our best and worst',
    authors: [{ given: 'Robert M.', family: 'Sapolsky', literal: '' }],
    year: '2017',
    publisher: 'Penguin Books',
    ...overrides,
  }
}
export const mantel = () =>
  sampleBook({
    id: 'mantel-2010',
    title: 'Wolf Hall',
    authors: [{ given: 'Hilary', family: 'Mantel', literal: '' }],
    year: '2010',
    publisher: 'Picador',
  })

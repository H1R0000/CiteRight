import { describe, expect, it, vi } from 'vitest'
import { emptyLibrary } from './model'
import { mergeImport, parseImport, serializeLibrary, copyFormatted } from './transfer'
import { sampleBook } from '../test/fixtures'
import { LIBRARY_KEY, readLibrary, writeLibrary } from './storage'
describe('library portability and recovery', () => {
  it('round-trips editable metadata and collections', () => {
    const library = {
      ...emptyLibrary(),
      collections: [{ id: 'thesis', name: 'Thesis' }],
      references: [sampleBook({ collectionIds: ['thesis'] })],
    }
    expect(parseImport(serializeLibrary(library))).toEqual(library)
  })
  it('merges without duplicates or silent replacement', () => {
    const original = sampleBook({ isbn: '9780140328721' })
    const current = { ...emptyLibrary(), references: [original] }
    const incoming = {
      ...emptyLibrary(),
      references: [
        sampleBook({ id: 'different-id', isbn: '0140328726' }),
        sampleBook({ id: 'new-edition', year: '2020', edition: '2' }),
      ],
    }
    const result = mergeImport(current, incoming)
    expect(result.added).toBe(1)
    expect(result.skipped).toBe(1)
    expect(result.library.references[0]).toEqual(original)
    expect(current.references).toHaveLength(1)
  })
  it('rejects malformed, future-version, unsafe, and inconsistent files before mutation', () => {
    expect(() => parseImport('{broken')).toThrow('valid JSON')
    expect(() => parseImport('{"version":9}')).toThrow('supported')
    expect(() =>
      parseImport(
        serializeLibrary({
          ...emptyLibrary(),
          references: [sampleBook({ url: 'javascript:bad' })],
        }),
      ),
    ).toThrow('invalid')
    expect(() =>
      parseImport(
        serializeLibrary({
          ...emptyLibrary(),
          references: [sampleBook({ collectionIds: ['missing'] })],
        }),
      ),
    ).toThrow('missing collection')
  })
  it('does not erase corrupt stored data and reports quota failures', () => {
    localStorage.setItem(LIBRARY_KEY, '{broken')
    expect(readLibrary().corrupt).toBe(true)
    expect(localStorage.getItem(LIBRARY_KEY)).toBe('{broken')
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })
    expect(writeLibrary(emptyLibrary())).toContain('only in memory')
    spy.mockRestore()
  })
  it('falls back to plain text and surfaces clipboard failure', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    expect(await copyFormatted({ html: '<i>A book</i>', text: 'A book' })).toBe('plain')
    expect(writeText).toHaveBeenCalledWith('A book')
    writeText.mockRejectedValue(new Error('Permission denied'))
    await expect(copyFormatted({ html: '', text: 'A book' })).rejects.toThrow('Permission denied')
  })
})

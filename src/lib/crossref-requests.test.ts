import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { crossrefArticle } from '../test/article-fixtures'

describe('Crossref lookup requests', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })
  const response = (message = crossrefArticle) =>
    new Response(JSON.stringify({ message }), { status: 200 })
  it('serializes requests and reuses queued and persistent cache entries', async () => {
    const fetch = vi.fn().mockImplementation(async () => response())
    vi.stubGlobal('fetch', fetch)
    const { lookupArticle } = await import('./crossref')
    const first = lookupArticle(crossrefArticle.DOI)
    const duplicate = lookupArticle(`https://doi.org/${crossrefArticle.DOI}`)
    await vi.runAllTimersAsync()
    const books = await Promise.all([first, duplicate])
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(books[0].doi).toBe(books[1].doi)
    vi.resetModules()
    const reload = await import('./crossref')
    expect((await reload.lookupArticle(crossrefArticle.DOI)).year).toBe('2019')
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('honors Retry-After and retries a bounded number of times', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 429, headers: { 'Retry-After': '3' } }))
      .mockImplementation(async () => response())
    vi.stubGlobal('fetch', fetch)
    const { lookupArticle } = await import('./crossref')
    const pending = lookupArticle(crossrefArticle.DOI)
    await vi.advanceTimersByTimeAsync(2000)
    expect(fetch).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1100)
    expect((await pending).type).toBe('article-journal')
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  it('reports a missing DOI without retries and never fetches cancelled queued requests', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('', { status: 404 }))
    vi.stubGlobal('fetch', fetch)
    const { lookupArticle } = await import('./crossref')
    const pending = expect(lookupArticle(crossrefArticle.DOI)).rejects.toThrow('No Crossref record')
    await vi.runAllTimersAsync()
    await pending
    const abort = new AbortController()
    abort.abort()
    await expect(lookupArticle('10.1234/cancelled', abort.signal)).rejects.toMatchObject({
      name: 'AbortError',
    })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('preserves a long server cooldown across attempts and rejects DOI mismatches', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response('', { status: 429, headers: { 'Retry-After': '60' } }))
    vi.stubGlobal('fetch', fetch)
    const { lookupArticle } = await import('./crossref')
    const pending = expect(lookupArticle(crossrefArticle.DOI)).rejects.toThrow('temporarily busy')
    await vi.runAllTimersAsync()
    await pending
    await expect(lookupArticle(crossrefArticle.DOI)).rejects.toThrow('asked us to wait')
    expect(fetch).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(60000)
    fetch.mockImplementation(async () => response({ ...crossrefArticle, DOI: '10.1234/wrong' }))
    const mismatch = expect(lookupArticle(crossrefArticle.DOI)).rejects.toThrow('different DOI')
    await vi.runAllTimersAsync()
    await mismatch
  })
})

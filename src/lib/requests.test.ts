import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('Open Library request scheduling', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })
  const response = () =>
    new Response(JSON.stringify({ numFound: 0, docs: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  it('spaces distinct requests and reuses queued duplicates', async () => {
    const fetch = vi.fn().mockImplementation(async () => response())
    vi.stubGlobal('fetch', fetch)
    const { searchBooks } = await import('./open-library')
    const first = searchBooks('first', 'all')
    const duplicate = searchBooks('first', 'all')
    const second = searchBooks('second', 'all')
    await vi.advanceTimersByTimeAsync(5)
    expect(fetch).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1090)
    expect(fetch).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(10)
    await Promise.all([first, duplicate, second])
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(JSON.parse(localStorage.getItem('citeright:api-cache:v1')!)).toHaveLength(2)
  })
  it('does not fetch a request cancelled while queued', async () => {
    const fetch = vi.fn().mockImplementation(async () => response())
    vi.stubGlobal('fetch', fetch)
    const { searchBooks } = await import('./open-library')
    const controller = new AbortController()
    controller.abort()
    await expect(searchBooks('cancelled', 'all', 1, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    })
    expect(fetch).not.toHaveBeenCalled()
  })
  it('waits for Retry-After before retrying', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 429, headers: { 'Retry-After': '3' } }))
      .mockImplementation(async () => response())
    vi.stubGlobal('fetch', fetch)
    const { searchBooks } = await import('./open-library')
    const pending = searchBooks('retry', 'all')
    await vi.advanceTimersByTimeAsync(2000)
    expect(fetch).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1100)
    await pending
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})

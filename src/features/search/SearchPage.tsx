import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  Search,
  Plus,
  Sparkles,
  Asterisk,
  ArrowUpRight,
  RotateCcw,
  BookOpen,
  Check,
  X,
  Bookmark,
  SlidersHorizontal,
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Dialog } from '../../components/ui/dialog'
import { BookCover } from '../../components/BookCover'
import {
  getEditions,
  loadEdition,
  searchBooks,
  type Edition,
  type SearchResult,
  type Work,
} from '../../lib/open-library'
import { readDraft, writeDraft } from '../../lib/storage'
import { useApp } from '../../app/AppProvider'
import { ArticleLookup } from './ArticleLookup'

function BookArt() {
  return (
    <div className="book-art" aria-hidden="true">
      <div className="art-orbit" />
      <span className="art-spark spark-one">
        <Sparkles />
      </span>
      <span className="art-spark spark-two">
        <Asterisk size={36} strokeWidth={1.2} />
      </span>
      <div className="art-book art-book-yellow">
        <div className="book-spine" />
        <div className="book-front">
          <span>
            BIG
            <br />
            IDEAS.
          </span>
          <div className="book-symbol">
            <span />
            <span />
            <span />
          </div>
          <small>START HERE</small>
        </div>
        <div className="book-pages" />
      </div>
      <div className="art-book art-book-purple">
        <div className="book-spine" />
        <div className="book-front">
          <Bookmark size={23} />
          <span>
            One more
            <br />
            chapter.
          </span>
          <div className="book-arc" />
        </div>
        <div className="book-pages" />
      </div>
      <div className="art-book art-book-mint">
        <div className="book-spine" />
        <div className="book-front">
          <small>A FIELD GUIDE TO</small>
          <span>curiosity</span>
          <div className="curiosity-lines">
            <i />
            <i />
            <i />
          </div>
        </div>
        <div className="book-pages" />
      </div>
      <span className="art-note">
        <Check size={15} />
        Credit where it’s due.
      </span>
    </div>
  )
}
const editionValue = (entry: Edition, field: 'publishers' | 'isbn' | 'language') =>
  field === 'publishers'
    ? entry.publishers?.join(', ') || 'Unavailable'
    : field === 'isbn'
      ? entry.isbn_13?.[0] || entry.isbn_10?.[0] || 'Unavailable'
      : entry.languages?.map((language) => language.key.replace('/languages/', '')).join(', ') ||
        'Unavailable'

function EditionPicker({
  work,
  isbnEdition,
  onClose,
}: {
  work?: Work
  isbnEdition?: Edition
  onClose: () => void
}) {
  const [entries, setEntries] = useState<Edition[]>(isbnEdition ? [isbnEdition] : [])
  const [total, setTotal] = useState(isbnEdition ? 1 : 0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(!!work)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [choosing, setChoosing] = useState('')
  const [compare, setCompare] = useState<string[]>([])
  const [replaceDraft, setReplaceDraft] = useState<Edition | null>(null)
  const choiceController = useRef<AbortController | null>(null)
  const navigate = useNavigate()
  const { notify } = useApp()
  useEffect(() => () => choiceController.current?.abort(), [])
  useEffect(() => {
    if (!work) return
    const controller = new AbortController()
    setLoading(true)
    setError('')
    getEditions(work.key, offset, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setEntries((previous) =>
            offset
              ? [
                  ...previous.filter(
                    (entry) => !result.entries.some((next) => next.key === entry.key),
                  ),
                  ...result.entries,
                ]
              : result.entries,
          )
          setTotal(result.total)
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(error instanceof Error ? error.message : 'Could not load editions.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [work, offset, retry])
  const choose = async (edition: Edition, replace = false) => {
    if (!replace && readDraft()?.title.trim()) {
      setReplaceDraft(edition)
      return
    }
    setReplaceDraft(null)
    choiceController.current?.abort()
    const controller = new AbortController()
    choiceController.current = controller
    setChoosing(edition.key)
    setError('')
    try {
      const book = await loadEdition(edition, controller.signal)
      if (controller.signal.aborted) return
      if (!writeDraft(book))
        notify(
          'Draft recovery is unavailable in this browser. You can still edit and export your work.',
          'error',
        )
      onClose()
      navigate('/editor/new', { state: { book } })
    } catch (error) {
      if (!controller.signal.aborted)
        setError(error instanceof Error ? error.message : 'Could not load this edition.')
    } finally {
      if (!controller.signal.aborted) setChoosing('')
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      wide
      title="Find your edition"
      description="The year and publisher can change between editions. Match these details to the copy you used."
    >
      <div className="edition-heading">
        <BookOpen size={22} />
        <strong>{work?.title || isbnEdition?.title}</strong>
        <span>{total ? `${total.toLocaleString()} edition${total === 1 ? '' : 's'}` : ''}</span>
      </div>
      {compare.length > 0 && (
        <section className="comparison">
          <div className="section-label">
            <strong>Side-by-side comparison</strong>
            <button className="text-button" onClick={() => setCompare([])}>
              Clear
              <X size={14} />
            </button>
          </div>
          <div className="table-scroll">
            <table>
              <caption className="sr-only">Compare selected editions</caption>
              <thead>
                <tr>
                  <th scope="col">Details</th>
                  {entries
                    .filter((entry) => compare.includes(entry.key))
                    .map((entry) => (
                      <th scope="col" key={entry.key}>
                        {entry.title || 'Untitled edition'}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {(['Year', 'Publisher', 'Edition', 'ISBN', 'Language'] as const).map((label) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    {entries
                      .filter((entry) => compare.includes(entry.key))
                      .map((entry) => (
                        <td key={entry.key}>
                          {label === 'Year'
                            ? entry.publish_date || 'Unavailable'
                            : label === 'Edition'
                              ? entry.edition_name || 'Not specified'
                              : editionValue(
                                  entry,
                                  label === 'Publisher'
                                    ? 'publishers'
                                    : label === 'ISBN'
                                      ? 'isbn'
                                      : 'language',
                                )}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <div className="edition-list">
        {entries.map((entry) => (
          <article className="edition-row" key={entry.key}>
            <BookCover
              id={entry.covers?.find((id) => id > 0)}
              title={entry.title || 'Untitled edition'}
              small
            />
            <div className="edition-details">
              <h3>{entry.title || 'Title unavailable'}</h3>
              <p>
                {entry.publish_date || 'Date unavailable'}
                <span> · </span>
                {editionValue(entry, 'publishers')}
              </p>
              <p className="muted small">
                {entry.edition_name || 'Edition not specified'} · {editionValue(entry, 'language')}
              </p>
              <p className="small muted">ISBN: {editionValue(entry, 'isbn')}</p>
            </div>
            <div className="edition-actions">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={compare.includes(entry.key)}
                  disabled={!compare.includes(entry.key) && compare.length >= 3}
                  onChange={(event) =>
                    setCompare((old) =>
                      event.target.checked
                        ? [...old, entry.key]
                        : old.filter((key) => key !== entry.key),
                    )
                  }
                />
                Compare
              </label>
              <Button size="sm" disabled={!!choosing} onClick={() => void choose(entry)}>
                {choosing === entry.key ? (
                  <>
                    <span className="spinner" />
                    Opening…
                  </>
                ) : (
                  <>
                    Use this edition
                    <ArrowRight size={15} />
                  </>
                )}
              </Button>
            </div>
          </article>
        ))}
      </div>
      {loading && (
        <p className="loading-line" role="status">
          <span className="spinner" />
          Finding publication details…
        </p>
      )}
      {error && (
        <div className="inline-error" role="alert">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={() => setRetry((value) => value + 1)}>
            Try again
          </Button>
          <Link className="text-button" to="/editor/new" onClick={onClose}>
            Enter manually
            <ArrowRight size={15} />
          </Link>
        </div>
      )}
      {!loading && !error && !entries.length && (
        <p className="muted">
          No editions are available for this work. Try another result or enter the details manually.
        </p>
      )}
      {!loading && entries.length < total && (
        <Button
          variant="outline"
          className="load-more"
          onClick={() => setOffset((value) => value + 12)}
        >
          Load more editions
        </Button>
      )}
      <Dialog
        open={!!replaceDraft}
        onOpenChange={(open) => {
          if (!open) setReplaceDraft(null)
        }}
        title="You have an unfinished draft"
        description="Opening another book will replace the current autosaved draft. Saved library references are unaffected."
      >
        <div className="dialog-actions">
          <Button
            variant="outline"
            onClick={() => {
              onClose()
              navigate('/editor/new')
            }}
          >
            Resume my draft
          </Button>
          <Button
            onClick={() => {
              if (replaceDraft) void choose(replaceDraft, true)
            }}
          >
            Replace draft
          </Button>
        </div>
      </Dialog>
    </Dialog>
  )
}

export function SearchPage() {
  const [sourceType, setSourceType] = useState<'books' | 'articles'>('books')
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const mode = (
    ['title', 'author'].includes(params.get('mode') || '') ? params.get('mode') : 'all'
  ) as 'all' | 'title' | 'author'
  const page = Math.max(1, Number(params.get('page')) || 1)
  const [input, setInput] = useState(q)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [selected, setSelected] = useState<Work | null>(null)
  const [isbnSelected, setIsbnSelected] = useState<Edition | null>(null)
  const [draft] = useState(readDraft)
  const lastQuery = useRef(q)
  useEffect(() => {
    if (q !== lastQuery.current) {
      setInput(q)
      lastQuery.current = q
    }
  }, [q])
  useEffect(() => {
    if (sourceType === 'articles' || input.trim() === q) return
    const timeout = setTimeout(() => {
      lastQuery.current = input.trim()
      setParams(input.trim() ? { q: input.trim(), mode } : {}, { replace: true })
    }, 500)
    return () => clearTimeout(timeout)
  }, [input, mode, q, setParams, sourceType])
  useEffect(() => {
    if (sourceType === 'articles' || q.length < 2) {
      setResult(null)
      setError('')
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setError('')
    setResult(null)
    searchBooks(q, mode, page, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult(data)
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error ? error.message : 'Search is unavailable. Please try again.',
          )
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [q, mode, page, retry, sourceType])
  function submit(event: FormEvent) {
    event.preventDefault()
    lastQuery.current = input.trim()
    setParams(input.trim() ? { q: input.trim(), mode } : {})
  }
  function example(query: string) {
    setInput(query)
    lastQuery.current = query
    setParams({ q: query, mode: 'all' })
  }
  return (
    <div className="page discover-page">
      <section className="hero">
        <div className="hero-copy">
          <h1>
            Big ideas.
            <br />
            <span>Proper credit.</span>
            <svg className="headline-underline" viewBox="0 0 320 18" fill="none" aria-hidden="true">
              <path
                d="M4 12C94 2 203 1 315 10"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
              />
            </svg>
          </h1>
          <p>
            Your next great paper starts here. Find a source, make a citation,
            <br className="desktop-break" /> and get back to the interesting part.
          </p>
          <div className="source-switch" role="group" aria-label="Source to cite">
            <button aria-pressed={sourceType === 'books'} onClick={() => setSourceType('books')}>
              Books
            </button>
            <button
              aria-pressed={sourceType === 'articles'}
              onClick={() => setSourceType('articles')}
            >
              Research papers
            </button>
          </div>
          {sourceType === 'articles' ? (
            <ArticleLookup />
          ) : (
            <>
              <form className="search-form" onSubmit={submit} role="search">
                <div className="search-box">
                  <Search size={22} aria-hidden="true" />
                  <label htmlFor="book-search" className="sr-only">
                    Search books by title, author, or ISBN
                  </label>
                  <input
                    id="book-search"
                    autoComplete="off"
                    maxLength={300}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Book title, author, or ISBN…"
                  />
                  <Button
                    type="submit"
                    disabled={input.trim().length < 2}
                    aria-label="Search books"
                  >
                    <span>Find a book</span>
                    <ArrowRight size={19} />
                  </Button>
                </div>
                <div className="search-options">
                  <div className="search-modes" role="group" aria-label="Search field">
                    {(['all', 'title', 'author'] as const).map((value) => (
                      <button
                        type="button"
                        key={value}
                        aria-pressed={mode === value}
                        onClick={() => setParams(q ? { q, mode: value } : { mode: value })}
                      >
                        {value === 'all' ? 'Everything' : value === 'title' ? 'Title' : 'Author'}
                      </button>
                    ))}
                  </div>
                  <Link to="/editor/new" className="manual-link">
                    <Plus size={16} />
                    Enter manually
                  </Link>
                </div>
              </form>
              <div className="try-searches">
                <span>Try a search</span>
                {['Atomic Habits', 'The Great Gatsby', 'A Brief History of Time'].map((query) => (
                  <button key={query} onClick={() => example(query)}>
                    {query}
                    <ArrowUpRight size={13} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <BookArt />
      </section>
      {draft?.title && (
        <div className="draft-banner">
          <span>
            <RotateCcw size={17} />
            <strong>Pick up where you left off</strong>
            <span className="muted">{draft.title}</span>
          </span>
          <Link to="/editor/new" className="text-button">
            Resume draft
            <ArrowRight size={16} />
          </Link>
        </div>
      )}
      {sourceType === 'books' && (q.length >= 2 || loading) ? (
        <section className="search-results" aria-label="Book search results">
          <div className="section-heading">
            <div>
              <h2>{loading ? 'Finding your next reference…' : `Results for “${q}”`}</h2>
              <p className="muted" aria-live="polite">
                {loading
                  ? 'Looking through Open Library. Good books take a moment.'
                  : result
                    ? `${result.total.toLocaleString()} matching ${result.total === 1 ? 'book' : 'books'}. Choose a book, then match your edition.`
                    : 'Let’s try another way.'}
              </p>
            </div>
            <span className="result-source">
              <SlidersHorizontal size={16} />
              Best match
            </span>
          </div>
          {loading && (
            <div className="results-grid" role="status" aria-label="Loading books">
              {Array.from({ length: 4 }, (_, index) => (
                <div className="result-skeleton" key={index}>
                  <div />
                  <span />
                  <span />
                </div>
              ))}
            </div>
          )}
          {error && (
            <div className="empty-state error-state">
              <BookOpen size={35} />
              <h3>A small pause in the story.</h3>
              <p role="alert">{error}</p>
              <div className="button-row">
                <Button onClick={() => setRetry((value) => value + 1)}>
                  <RotateCcw size={16} />
                  Try again
                </Button>
                <Button asChild variant="outline">
                  <Link to="/editor/new">Enter manually</Link>
                </Button>
              </div>
            </div>
          )}
          {result?.isbnEdition && (
            <article className="isbn-result">
              <BookCover
                id={result.isbnEdition.covers?.find((id) => id > 0)}
                title={result.isbnEdition.title || 'Untitled book'}
              />
              <div>
                <span className="badge badge-mint">ISBN match</span>
                <h3>{result.isbnEdition.title || 'Title unavailable'}</h3>
                <p>
                  {result.isbnEdition.publish_date || 'Date unavailable'} ·{' '}
                  {result.isbnEdition.publishers?.join(', ') || 'Publisher unavailable'}
                </p>
                <Button onClick={() => setIsbnSelected(result.isbnEdition!)}>
                  Review this edition
                  <ArrowRight size={16} />
                </Button>
              </div>
            </article>
          )}
          {result && !result.total && (
            <div className="empty-state">
              <Search size={35} />
              <h3>No books on this shelf. Yet.</h3>
              <p>
                Try a shorter title, an author’s name, or the ISBN on your book. You can always add
                the details yourself.
              </p>
              <Button asChild variant="outline">
                <Link to="/editor/new">
                  <Plus size={16} />
                  Create a manual citation
                </Link>
              </Button>
            </div>
          )}
          {result && result.works.length > 0 && (
            <>
              <div className="results-grid">
                {result.works.map((work, index) => (
                  <article
                    className="book-result"
                    key={work.key}
                    style={
                      { '--result-delay': `${Math.min(index, 7) * 45}ms` } as React.CSSProperties
                    }
                  >
                    <button className="book-result-button" onClick={() => setSelected(work)}>
                      <div className="result-cover-stage">
                        <BookCover id={work.cover_i} title={work.title} />
                        <span className="result-arrow">
                          <ArrowUpRight size={19} />
                        </span>
                      </div>
                      <div className="result-details">
                        <h3>{work.title}</h3>
                        <p>{work.author_name?.join(', ') || 'Author unavailable'}</p>
                        <span>
                          {work.first_publish_year
                            ? `First published ${work.first_publish_year}`
                            : 'Publication date unavailable'}
                        </span>
                        <strong>
                          {work.edition_count || 'View'} editions
                          <ArrowRight size={14} />
                        </strong>
                      </div>
                    </button>
                  </article>
                ))}
              </div>
              <div className="pagination">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setParams({ q, mode, page: String(page - 1) })}
                >
                  Previous
                </Button>
                <span>Page {page}</span>
                <Button
                  variant="outline"
                  disabled={page * 20 >= result.total}
                  onClick={() => setParams({ q, mode, page: String(page + 1) })}
                >
                  Next
                  <ArrowRight size={16} />
                </Button>
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="how-it-works">
          <div className="how-heading">
            <h2>
              Less formatting.
              <br />
              More <span>“finally, done.”</span>
            </h2>
            <p>From a source you’ve found to a reference in your paper. Three small steps.</p>
            <span className="free-note">
              <span />
              Free to use. No account needed.
            </span>
          </div>
          <div className="how-steps">
            <div className="how-step">
              <span className="step-number step-violet">1</span>
              <div>
                <h3>Find your source</h3>
                <p>
                  Find a book on Open Library, or paste a journal or conference paper’s DOI for a
                  Crossref lookup.
                </p>
              </div>
            </div>
            <div className="how-step">
              <span className="step-number step-mint">2</span>
              <div>
                <h3>Make it yours</h3>
                <p>Check the details. Choose APA or MLA. We’ll take care of the punctuation.</p>
              </div>
            </div>
            <div className="how-step">
              <span className="step-number step-yellow">3</span>
              <div>
                <h3>Copy. Save. Carry on.</h3>
                <p>
                  Drop it into your paper or keep it in a collection for your next writing session.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
      <div className="privacy-strip">
        <BookOpen size={20} />
        <p>
          Your research stays yours. References are saved in this browser, ready when inspiration
          strikes.
        </p>
        <Link to="/about">
          Meet CiteRight
          <ArrowUpRight size={15} />
        </Link>
      </div>
      {selected && <EditionPicker work={selected} onClose={() => setSelected(null)} />}
      {isbnSelected && (
        <EditionPicker isbnEdition={isbnSelected} onClose={() => setIsbnSelected(null)} />
      )}
    </div>
  )
}

import { useDeferredValue, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Link, useBeforeUnload, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Plus,
  X,
  BookmarkPlus,
  Check,
  CheckCircle2,
  AlertCircle,
  CircleHelp,
  ExternalLink,
  RotateCcw,
  Download,
  FolderPlus,
  BookOpen,
} from 'lucide-react'
import { useApp } from '../../app/AppProvider'
import { Button } from '../../components/ui/button'
import { Dialog } from '../../components/ui/dialog'
import { CopyButton } from '../../components/CopyButton'
import { StyleSelector } from '../../components/StyleSelector'
import { BookCover } from '../../components/BookCover'
import {
  blankAuthor,
  bookSchema,
  findDuplicate,
  issuesFor,
  newBook,
  safeUrl,
  type Author,
  type Book,
} from '../../lib/model'
import { clearDraft, readDraft, writeDraft } from '../../lib/storage'
import { formatBibliography, formatInText } from '../../lib/citations'
import { downloadFile, serializeLibrary } from '../../lib/transfer'

function EditorWorkspace({ initial }: { initial: Book }) {
  const [book, setBook] = useState(initial)
  const isArticle = book.type === 'article-journal'
  const isConference = book.type === 'paper-conference'
  const isPaper = isArticle || isConference
  const [draftStatus, setDraftStatus] = useState<'unchanged' | 'saved' | 'failed'>('unchanged')
  const [locator, setLocator] = useState('')
  const [duplicate, setDuplicate] = useState<Book | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [collectionName, setCollectionName] = useState('')
  const [addingCollection, setAddingCollection] = useState(false)
  const saveRect = useRef<DOMRect | null>(null)
  const { style, library, saveBook, animateSave, notify, updateLibrary } = useApp()
  const navigate = useNavigate()
  const deferredBook = useDeferredValue(book)
  const issues = issuesFor(book)
  const blocked = issues.some((issue) => issue.severity === 'error')
  const locatorValid =
    !locator.trim() ||
    /^(?:[1-9]\d*|[ivxlcdm]+)(?:\s*[-–]\s*(?:[1-9]\d*|[ivxlcdm]+))?$/i.test(locator.trim())
  const existing = library.references.some((item) => item.id === book.id)
  const preview = useMemo(() => {
    if (
      !deferredBook.title.trim() ||
      issuesFor(deferredBook).some((issue) => issue.severity === 'error')
    )
      return { bibliography: { html: '', text: '' }, citation: { html: '', text: '' }, error: '' }
    try {
      const context = [
        ...library.references.filter((item) => item.id !== deferredBook.id),
        deferredBook,
      ]
      const bibliography = formatBibliography(context, style).entries.find(
        (entry) => entry.id === deferredBook.id,
      )!
      return {
        bibliography,
        citation: formatInText(deferredBook, style, locatorValid ? locator : '', context),
        error: '',
      }
    } catch {
      return {
        bibliography: { html: '', text: '' },
        citation: { html: '', text: '' },
        error:
          'We could not format these details. Check the fields and try again. Your draft is still available.',
      }
    }
  }, [deferredBook, library.references, style, locator, locatorValid])
  const update = (patch: Partial<Book>) => {
    const next = { ...book, ...patch, updatedAt: new Date().toISOString() }
    setBook(next)
    setDraftStatus(writeDraft(next) ? 'saved' : 'failed')
  }
  useBeforeUnload((event) => {
    if (draftStatus === 'failed') {
      event.preventDefault()
      event.returnValue = ''
    }
  })
  const fieldChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    update({ [event.target.name]: event.target.value })
  const updateAuthor = (index: number, patch: Partial<Author>) =>
    update({
      authors: book.authors.map((author, current) =>
        current === index ? { ...author, ...patch } : author,
      ),
    })
  const moveAuthor = (index: number, offset: number) => {
    const authors = [...book.authors]
    ;[authors[index], authors[index + offset]] = [authors[index + offset], authors[index]]
    update({ authors })
  }
  const commit = (replaceId?: string) => {
    try {
      const result = saveBook(book, replaceId)
      if (result.persisted) {
        clearDraft()
        setDraftStatus('unchanged')
        if (saveRect.current) animateSave(saveRect.current)
        notify(
          existing || replaceId
            ? 'Reference updated. Looking good.'
            : 'A good idea, safely shelved. Reference saved.',
        )
        navigate(`/editor/${result.id}`, { replace: true })
      }
      setDuplicate(null)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not save this reference.', 'error')
    }
  }
  const addCollection = () => {
    const name = collectionName.trim()
    if (!name) return
    const matched = library.collections.find(
      (collection) => collection.name.toLowerCase() === name.toLowerCase(),
    )
    const id = matched?.id || crypto.randomUUID()
    try {
      if (!matched)
        updateLibrary((current) => {
          if (current.collections.length >= 100)
            throw new Error('You can have up to 100 collections.')
          return { ...current, collections: [...current.collections, { id, name }] }
        })
      update({ collectionIds: [...new Set([...book.collectionIds, id])] })
      setCollectionName('')
      setAddingCollection(false)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not create this collection.', 'error')
    }
  }
  const errorFor = (field: string) =>
    issues.find((issue) => issue.field === field && issue.severity === 'error')
  const renderField = (
    name:
      | 'year'
      | 'publisher'
      | 'edition'
      | 'isbn'
      | 'doi'
      | 'url'
      | 'journal'
      | 'proceedings'
      | 'volume'
      | 'issue'
      | 'pages'
      | 'articleNumber',
    label: string,
    placeholder: string,
    hint?: string,
  ) => (
    <div className="field">
      <label htmlFor={name}>
        {label}
        <span>Optional</span>
      </label>
      <input
        id={name}
        name={name}
        value={book[name]}
        onChange={fieldChange}
        placeholder={placeholder}
        maxLength={
          name === 'url' || name === 'proceedings'
            ? 2000
            : name === 'publisher' || name === 'journal'
              ? 1000
              : name === 'doi'
                ? 500
                : name === 'edition'
                  ? 200
                  : name === 'year'
                    ? 4
                    : 100
        }
        aria-invalid={!!errorFor(name)}
        aria-describedby={errorFor(name) ? `${name}-error` : hint ? `${name}-hint` : undefined}
      />
      {errorFor(name) ? (
        <small id={`${name}-error`} className="field-error">
          {errorFor(name)!.message}
        </small>
      ) : (
        hint && (
          <small id={`${name}-hint`} className="field-hint">
            {hint}
          </small>
        )
      )}
    </div>
  )
  return (
    <div className="page editor-page">
      <Link to="/" className="back-link">
        <ArrowLeft size={16} />
        Back to discovering
      </Link>
      <div className="page-heading">
        <div>
          <h1>
            Your citation, <span>coming together.</span>
          </h1>
          <p className="muted">A quick check now. A little peace of mind later.</p>
        </div>
        <div className="draft-status" role="status">
          {draftStatus === 'failed' ? (
            <>
              <AlertCircle size={15} />
              Draft not saved — download a copy
            </>
          ) : draftStatus === 'saved' ? (
            <>
              <Check size={15} />
              Draft saved in this browser
            </>
          ) : (
            <>
              <BookOpen size={15} />
              {existing ? 'Editing a saved reference' : 'Your citation studio'}
            </>
          )}
        </div>
      </div>
      <div className="editor-layout">
        <section className="editor-form panel" aria-labelledby="details-heading">
          <div className="panel-heading">
            <h2 id="details-heading">
              {isConference
                ? 'The conference paper details'
                : isArticle
                  ? 'The article details'
                  : 'The book details'}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setResetOpen(true)}>
              <Plus size={15} />
              Start fresh
            </Button>
          </div>
          <div className="field">
            <label htmlFor="source-type">Source type</label>
            <select
              id="source-type"
              value={book.type}
              onChange={(event) =>
                update({
                  type: event.target.value as Book['type'],
                  source: { imported: false, reviewed: true },
                  coverId: undefined,
                })
              }
            >
              <option value="book">Book / ebook</option>
              <option value="article-journal">Journal article</option>
              <option value="paper-conference">Conference paper (published proceedings)</option>
            </select>
          </div>
          {book.source.imported && (
            <div className="source-banner">
              <BookCover id={book.coverId} title={book.title} small />
              <div>
                <strong>
                  {isPaper ? 'Paper metadata from Crossref' : 'From your selected edition'}
                </strong>
                <p>
                  {book.source.publicationDate || 'Publication date unavailable'} ·{' '}
                  {isConference
                    ? book.proceedings || 'Proceedings unavailable'
                    : isArticle
                      ? book.journal || 'Journal unavailable'
                      : book.source.editionKey?.replace('/books/', '')}
                </p>
                {book.source.catalogUrl && safeUrl(book.source.catalogUrl) && (
                  <a href={book.source.catalogUrl} target="_blank" rel="noreferrer">
                    {isPaper ? 'Open DOI / publisher page' : 'View Open Library record'}
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          )}
          <div className="field">
            <label htmlFor="title">
              {isConference ? 'Paper title' : isArticle ? 'Article title' : 'Book title'}
              <span>Required</span>
            </label>
            <textarea
              id="title"
              name="title"
              rows={2}
              value={book.title}
              onChange={fieldChange}
              maxLength={2000}
              placeholder="Every great reference starts with a title"
              aria-invalid={!!errorFor('title')}
              aria-describedby="title-hint"
            />
            <small className="field-hint" id="title-hint">
              {style === 'apa'
                ? 'APA uses sentence case: “Face recognition using ResNet: A classroom study.” Capitalize the first word, the first word after a colon, and proper nouns. Edit here and review the live preview; names such as ResNet must stay intact.'
                : 'MLA uses title case for English titles. Review capitalization before copying.'}
            </small>
          </div>
          <fieldset className="author-fields" id="authors">
            <legend>
              Authors<span>In the order shown in the source</span>
            </legend>
            {book.source.imported && !book.source.reviewed && (
              <p className="field-hint">
                Imported name divisions may be wrong. The family-name field appears first in the
                reference and is used in your in-text citation. Compare these fields with the
                publisher or book before confirming them; we never swap names automatically.
              </p>
            )}
            {book.authors.map((author, index) => (
              <div className="author-row" key={index}>
                <div className="author-inputs">
                  {author.literal ? (
                    <div className="field">
                      <label htmlFor={`literal-${index}`}>Organization / full name</label>
                      <input
                        id={`literal-${index}`}
                        value={author.literal}
                        maxLength={600}
                        onChange={(event) =>
                          updateAuthor(index, { literal: event.target.value || ' ' })
                        }
                      />
                    </div>
                  ) : (
                    <>
                      <div className="field">
                        <label htmlFor={`given-${index}`}>Given name(s)</label>
                        <input
                          id={`given-${index}`}
                          value={author.given}
                          maxLength={300}
                          placeholder="e.g. Toni"
                          onChange={(event) => updateAuthor(index, { given: event.target.value })}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`family-${index}`}>Family name</label>
                        <input
                          id={`family-${index}`}
                          value={author.family}
                          maxLength={300}
                          placeholder="e.g. Morrison"
                          onChange={(event) => updateAuthor(index, { family: event.target.value })}
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="author-controls">
                  <button
                    type="button"
                    className="text-button small"
                    onClick={() =>
                      updateAuthor(
                        index,
                        author.literal
                          ? { literal: '', family: author.literal.trim(), given: '' }
                          : {
                              literal:
                                [author.given, author.family].filter(Boolean).join(' ') || ' ',
                              given: '',
                              family: '',
                            },
                      )
                    }
                  >
                    {author.literal ? 'Use personal name' : 'Organization / full name'}
                  </button>
                  <div>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={index === 0}
                      aria-label={`Move author ${index + 1} up`}
                      onClick={() => moveAuthor(index, -1)}
                    >
                      <ArrowUp size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={index === book.authors.length - 1}
                      aria-label={`Move author ${index + 1} down`}
                      onClick={() => moveAuthor(index, 1)}
                    >
                      <ArrowDown size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove author ${index + 1}`}
                      onClick={() =>
                        update({ authors: book.authors.filter((_, current) => current !== index) })
                      }
                    >
                      <X size={15} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={book.authors.length >= 100}
              onClick={() => update({ authors: [...book.authors, blankAuthor()] })}
            >
              <Plus size={15} />
              Add author
            </Button>
            <small className="field-hint">
              No author listed? Leave this blank. Don’t substitute “Anonymous” unless credited that
              way.
            </small>
          </fieldset>
          <div className="field-grid">
            {renderField(
              'year',
              'Publication year',
              'e.g. 2021',
              isPaper
                ? 'Use the year of the published paper, not the database deposit date.'
                : 'Use the year for this edition.',
            )}
            {isConference ? (
              <>
                {renderField(
                  'proceedings',
                  'Proceedings title',
                  'Title of the published conference proceedings',
                )}
                {renderField('publisher', 'Publisher', 'e.g. IEEE')}
                {renderField('volume', 'Volume', 'If assigned')}
                {renderField(
                  'pages',
                  'Paper page range',
                  'e.g. 141–148',
                  'Full page range in the published proceedings. Quotation pages go in the in-text preview.',
                )}
              </>
            ) : isArticle ? (
              <>
                {renderField('journal', 'Journal name', 'e.g. Nature')}
                {renderField('volume', 'Volume', 'e.g. 12')}
                {renderField('issue', 'Issue', 'e.g. 3')}
                {renderField(
                  'pages',
                  'Article page range',
                  'e.g. 207–217',
                  'The full article’s pages. Add the page you quote in the in-text preview.',
                )}
                {renderField(
                  'articleNumber',
                  'Article number',
                  'e.g. e0193972',
                  'For journals using an article number instead of pages. APA prefers this number if both are supplied.',
                )}
              </>
            ) : (
              <>
                {renderField('edition', 'Edition', 'e.g. 2 or Revised edition')}
                {renderField('publisher', 'Publisher', 'e.g. Penguin Books')}
                {renderField('isbn', 'ISBN', '10 or 13 digits')}
              </>
            )}
          </div>
          {isConference && (
            <details className="extra-fields" open={book.editors.length > 0}>
              <summary>
                Proceedings editors<span>Only if credited in the publication</span>
              </summary>
              <p className="field-hint">
                Keep the credited order. Do not use the conference organizers as editors unless the
                proceedings credit them.
              </p>
              {book.editors.map((editor, index) => (
                <div className="author-row" key={index}>
                  <div className="field-grid">
                    {(['given', 'family', 'literal'] as const).map((name) => (
                      <div className="field" key={name}>
                        <label htmlFor={`editor-${index}-${name}`}>
                          Editor {index + 1}:{' '}
                          {name === 'given'
                            ? 'given name(s)'
                            : name === 'family'
                              ? 'family name'
                              : 'organization / full name'}
                        </label>
                        <input
                          id={`editor-${index}-${name}`}
                          value={editor[name]}
                          maxLength={name === 'literal' ? 600 : 300}
                          onChange={(event) =>
                            update({
                              editors: book.editors.map((person, position) =>
                                position === index
                                  ? { ...person, [name]: event.target.value }
                                  : person,
                              ),
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      update({ editors: book.editors.filter((_, position) => position !== index) })
                    }
                  >
                    Remove editor {index + 1}
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                disabled={book.editors.length >= 100}
                onClick={() => update({ editors: [...book.editors, blankAuthor()] })}
              >
                <Plus size={15} />
                Add proceedings editor
              </Button>
            </details>
          )}
          <details
            className="extra-fields"
            open={isPaper || !!book.doi || !!book.url || !!errorFor('doi') || !!errorFor('url')}
          >
            <summary>
              DOI & online location
              <span>{isPaper ? 'For the published paper' : 'For ebooks and online editions'}</span>
            </summary>
            <div className="field-grid">
              {renderField('doi', 'DOI', '10.1037/0000168-000')}
              {renderField(
                'url',
                isConference ? 'Paper URL' : isArticle ? 'Article URL' : 'Book URL',
                'https://…',
                isPaper
                  ? 'Use a stable article URL if there is no DOI. Do not use a Google Scholar search link.'
                  : 'Use the book’s stable URL, not a bookstore or catalog listing.',
              )}
            </div>
          </details>
          <div className="collection-picker">
            <div className="section-label">
              <h3>Keep it in a collection</h3>
              <button
                className="text-button"
                onClick={() => setAddingCollection(!addingCollection)}
              >
                <FolderPlus size={15} />
                New
              </button>
            </div>
            {library.collections.length ? (
              <div className="collection-checkboxes">
                {library.collections.map((collection) => (
                  <label className="checkbox-label" key={collection.id}>
                    <input
                      type="checkbox"
                      checked={book.collectionIds.includes(collection.id)}
                      onChange={(event) =>
                        update({
                          collectionIds: event.target.checked
                            ? [...book.collectionIds, collection.id]
                            : book.collectionIds.filter((id) => id !== collection.id),
                        })
                      }
                    />
                    {collection.name}
                  </label>
                ))}
              </div>
            ) : (
              <p className="muted small">
                An assignment, a thesis, a rabbit hole. Give your references a home.
              </p>
            )}
            {addingCollection && (
              <div className="inline-form">
                <label className="sr-only" htmlFor="new-collection">
                  Collection name
                </label>
                <input
                  id="new-collection"
                  maxLength={80}
                  placeholder="e.g. The big thesis"
                  value={collectionName}
                  onChange={(event) => setCollectionName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') addCollection()
                  }}
                />
                <Button size="sm" disabled={!collectionName.trim()} onClick={addCollection}>
                  Create
                </Button>
              </div>
            )}
          </div>
        </section>
        <aside className="editor-sidebar">
          <section className="preview-panel panel">
            <div className="panel-heading">
              <h2>Looks good on paper.</h2>
              <span className="live-indicator">
                <span />
                Live preview
              </span>
            </div>
            <StyleSelector />
            <div className="preview-content" key={style}>
              <h3>{style === 'apa' ? 'Reference entry' : 'Works-cited entry'}</h3>
              {preview.error ? (
                <p role="alert" className="field-error">
                  {preview.error}
                </p>
              ) : preview.bibliography.text ? (
                <div
                  className="citation-output"
                  data-testid="bibliography-preview"
                  dangerouslySetInnerHTML={{ __html: preview.bibliography.html }}
                />
              ) : (
                <div className="preview-placeholder">
                  <span className="quote-mark">“</span>
                  <p>
                    {blocked && book.title
                      ? 'Fix the highlighted details to see your citation.'
                      : 'A title is all it takes to get started. Your citation will appear right here.'}
                  </p>
                </div>
              )}
              <CopyButton value={preview.bibliography} disabled={blocked} />
              <details className="paste-guide">
                <summary>How do I put this in my paper?</summary>
                <p>
                  Use Copy citation for your References (APA) or Works Cited (MLA) list at the end
                  of your paper. Use Copy in-text beside the sentence that uses the source; add a
                  page when quoting.
                </p>
                <p>
                  In Word or Google Docs, paste normally with Ctrl+V (Command+V on Mac). Avoid
                  “paste as plain text” if you want to retain italics. Word may offer Keep Source
                  Formatting.
                </p>
                <p>
                  Check the pasted result: your document controls the final appearance. If needed,
                  select the reference list and set a 0.5-inch hanging indent and double line
                  spacing in its paragraph settings. If CiteRight reports plain-text copying,
                  restore italics using the preview.
                </p>
              </details>
              <div className="intext-section">
                <h3>In your text</h3>
                <div className="intext-output" data-testid="intext-preview">
                  {preview.citation.text ? (
                    <span dangerouslySetInnerHTML={{ __html: preview.citation.html }} />
                  ) : (
                    <span className="muted">Your parenthetical citation</span>
                  )}
                </div>
                <div className="field locator-field">
                  <label htmlFor="locator">
                    Page or page range<span>Optional</span>
                  </label>
                  <input
                    id="locator"
                    placeholder="e.g. 24 or 24–28"
                    value={locator}
                    maxLength={40}
                    onChange={(event) => setLocator(event.target.value)}
                    aria-invalid={!locatorValid}
                    aria-describedby={!locatorValid ? 'locator-error' : undefined}
                  />
                  {!locatorValid && (
                    <small id="locator-error" className="field-error">
                      Use a page number or range, such as 24–28 or iv–vi.
                    </small>
                  )}
                </div>
                <CopyButton
                  label="Copy in-text"
                  value={preview.citation}
                  disabled={blocked || !locatorValid}
                />
              </div>
            </div>
            <div className="save-area">
              <Button
                className="save-button"
                disabled={blocked}
                onClick={(event) => {
                  saveRect.current = event.currentTarget.getBoundingClientRect()
                  const match = findDuplicate(book, library.references)
                  if (match) setDuplicate(match.book)
                  else commit()
                }}
              >
                <BookmarkPlus size={18} />
                {existing ? 'Save changes' : 'Save to my library'}
              </Button>
              <button
                className="text-button small"
                disabled={blocked}
                onClick={() =>
                  downloadFile(
                    'citeright-reference.json',
                    serializeLibrary({
                      version: 1,
                      references: [book],
                      collections: library.collections.filter((collection) =>
                        book.collectionIds.includes(collection.id),
                      ),
                    }),
                  )
                }
              >
                <Download size={14} />
                Download this reference as JSON
              </button>
            </div>
          </section>
          <section className="readiness-panel" aria-labelledby="readiness-heading">
            <h2 id="readiness-heading">
              {issues.length ? (
                <>
                  <AlertCircle size={19} />A quick double-check
                </>
              ) : (
                <>
                  <CheckCircle2 size={19} />
                  Your details are filled in
                </>
              )}
            </h2>
            {issues.length ? (
              <ul>
                {issues.map((issue, index) => (
                  <li key={`${issue.field}-${index}`}>
                    <button
                      onClick={() => {
                        const target = document.getElementById(issue.field)
                        target?.scrollIntoView({
                          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                            ? 'instant'
                            : 'smooth',
                          block: 'center',
                        })
                        ;(target?.matches('input,textarea')
                          ? target
                          : target?.querySelector('input')
                        )?.focus()
                      }}
                    >
                      <span
                        className={issue.severity === 'error' ? 'issue-dot error-dot' : 'issue-dot'}
                      />
                      {issue.message}
                      <ArrowLeft size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Formatting is ready. Compare the details with your book before submitting.</p>
            )}
            {book.source.imported && !book.source.reviewed && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  update({ source: { ...book.source, reviewed: true, authorsIncomplete: false } })
                }
              >
                <Check size={15} />
                I’ve reviewed the imported details
              </Button>
            )}
            <p className="small muted">
              Missing facts stay missing. We never fill in bibliographic details by guessing.
            </p>
          </section>
          <details className="explanation">
            <summary>
              <CircleHelp size={19} />
              Why does it look like this?
            </summary>
            {isConference ? (
              <>
                <p>
                  {style === 'apa'
                    ? 'APA 7 formats a paper published in proceedings like a contribution to a collected work: authors, year, paper title, proceedings title and pages, publisher, and DOI. Credited editors are included when supplied.'
                    : 'MLA 9 places the paper title in quotation marks, followed by the italicized proceedings title, any credited editors, publisher, year, pages, and DOI.'}
                </p>
                <p>
                  Use the published proceedings details. Unpublished conference presentations
                  require a different format. Keep author names and title capitalization as verified
                  against the paper.
                </p>
                <a
                  href={
                    style === 'apa'
                      ? 'https://apastyle.apa.org/style-grammar-guidelines/references/examples/conference-proceeding-references'
                      : 'https://style.mla.org/citing-conference-proceedings/'
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Read proceedings guidance
                  <ExternalLink size={13} />
                </a>
              </>
            ) : isArticle ? (
              <>
                <p>
                  {style === 'apa'
                    ? 'APA 7 uses sentence case for the article title. The journal name and volume are italicized; the issue appears in parentheses. Pages or an article number follow.'
                    : 'MLA 9 places the article title in quotation marks and italicizes the journal name. Volume, issue, year, and pages identify the published article.'}
                </p>
                <p>
                  {style === 'apa'
                    ? 'In-text citations use author and year; add a page number for a quotation.'
                    : 'In-text citations usually use author and the page you cite, without a publication year.'}{' '}
                  The article’s full page range belongs in the reference, not in every in-text
                  citation.
                </p>
                <a
                  href={
                    style === 'apa'
                      ? 'https://apastyle.apa.org/style-grammar-guidelines/references/examples/journal-article-references'
                      : 'https://style.mla.org/works-cited/citations-by-format/'
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Read {style === 'apa' ? 'APA' : 'MLA'} article examples
                  <ExternalLink size={13} />
                </a>
              </>
            ) : style === 'apa' ? (
              <>
                <p>
                  APA 7 puts the author’s surname and initials first, followed by the publication
                  year. The book title is italicized and uses sentence case.
                </p>
                <p>
                  An edition appears after the title. Parenthetical citations use author and year;
                  page references add “p.” or “pp.”
                </p>
                <a
                  href="https://apastyle.apa.org/style-grammar-guidelines/references/examples/book-references"
                  target="_blank"
                  rel="noreferrer"
                >
                  Read APA’s book examples
                  <ExternalLink size={13} />
                </a>
              </>
            ) : (
              <>
                <p>
                  MLA 9 begins with the author’s surname and given name, then the italicized book
                  title in title case. The publisher and publication year follow.
                </p>
                <p>
                  Parenthetical citations usually contain the author and page, without a comma or
                  “p.” The style may shorten titles to distinguish an author’s books.
                </p>
                <a
                  href="https://style.mla.org/works-cited/citations-by-format/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Read MLA’s book examples
                  <ExternalLink size={13} />
                </a>
              </>
            )}
            <p>
              With no author, the style uses the title. With no date, APA uses “n.d.”; MLA omits it.
              A DOI, when supplied, takes priority over a URL. Bibliography order and same-author
              disambiguation are handled by CSL.
            </p>
            <p className="small muted">
              Your preview uses the other references in your saved library for disambiguation.
              Copying a smaller selection can change the suffixes it needs.
            </p>
          </details>
        </aside>
      </div>
      <Dialog
        open={!!duplicate}
        onOpenChange={(open) => {
          if (!open) setDuplicate(null)
        }}
        title={
          isPaper ? 'This paper is already on your shelf' : 'This book is already on your shelf'
        }
        description="A matching reference exists. Open it, or explicitly replace its details with this version."
      >
        <p className="duplicate-title">{duplicate?.title}</p>
        <div className="dialog-actions">
          <Button
            variant="outline"
            onClick={() => {
              if (duplicate) navigate(`/editor/${duplicate.id}`)
              setDuplicate(null)
            }}
          >
            Open existing
          </Button>
          <Button onClick={() => commit(duplicate?.id)}>Replace existing</Button>
        </div>
      </Dialog>
      <Dialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Start a fresh citation?"
        description="This clears the current draft. References already saved to your library will stay there."
      >
        <div className="dialog-actions">
          <Button variant="outline" onClick={() => setResetOpen(false)}>
            Keep working
          </Button>
          <Button
            onClick={() => {
              clearDraft()
              setResetOpen(false)
              navigate('/editor/new', { state: { book: newBook(book.type) }, replace: true })
            }}
          >
            <RotateCcw size={16} />
            Start fresh
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
export default function EditorPage() {
  const { id } = useParams()
  const location = useLocation()
  const { library } = useApp()
  const passed = bookSchema.safeParse((location.state as { book?: unknown } | null)?.book)
  const draft = readDraft()
  const saved = library.references.find((book) => book.id === id)
  const initial = passed.success
    ? passed.data
    : id === 'new'
      ? draft || newBook()
      : draft && draft.id === id && (!saved || draft.updatedAt > saved.updatedAt)
        ? draft
        : saved
  if (!initial)
    return (
      <div className="page empty-state">
        <BookOpen size={40} />
        <h1>This reference isn’t in this browser.</h1>
        <p>
          It may have been deleted, or saved on another device. Import your JSON backup to bring it
          here.
        </p>
        <Button asChild>
          <Link to="/library">Open my library</Link>
        </Button>
      </div>
    )
  return <EditorWorkspace key={`${id}:${location.key}`} initial={initial} />
}

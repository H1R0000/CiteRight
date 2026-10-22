import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookMarked,
  Plus,
  Folder,
  FolderPlus,
  ArrowRight,
  Search,
  List,
  LayoutGrid,
  Download,
  Upload,
  Pencil,
  Trash2,
  X,
  Archive,
  Check,
  AlertCircle,
} from 'lucide-react'
import { useApp } from '../../app/AppProvider'
import { Button } from '../../components/ui/button'
import { Dialog } from '../../components/ui/dialog'
import { BookCover } from '../../components/BookCover'
import { CopyButton } from '../../components/CopyButton'
import { StyleSelector } from '../../components/StyleSelector'
import { bookAuthors, type Collection, type Library } from '../../lib/model'
import { exportBibtex, formatBibliography } from '../../lib/citations'
import { downloadFile, mergeImport, parseImport, serializeLibrary } from '../../lib/transfer'

export default function LibraryPage() {
  const { library, style, updateLibrary, removeBook, notify } = useApp()
  const [collectionId, setCollectionId] = useState('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [collectionDialog, setCollectionDialog] = useState<'new' | Collection | null>(null)
  const [collectionName, setCollectionName] = useState('')
  const [deleteCollection, setDeleteCollection] = useState<Collection | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignId, setAssignId] = useState('')
  const [incoming, setIncoming] = useState<Library | null>(null)
  const [importing, setImporting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const activeCollection = library.collections.find((collection) => collection.id === collectionId)
  const filtered = useMemo(
    () =>
      library.references.filter(
        (book) =>
          (collectionId === 'all' ||
            (collectionId === 'unfiled'
              ? !book.collectionIds.length
              : book.collectionIds.includes(collectionId))) &&
          `${book.title} ${bookAuthors(book)} ${book.publisher} ${book.isbn}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      ),
    [library.references, collectionId, query],
  )
  const selectedBooks = filtered.filter((book) => selected.includes(book.id))
  const exportBooks = selectedBooks.length ? selectedBooks : filtered
  const formatted = useMemo(() => {
    try {
      return { ...formatBibliography(filtered, style), error: '' }
    } catch {
      return {
        html: '',
        text: '',
        entries: [],
        error:
          'A reference could not be formatted. You can still export JSON and edit its details.',
      }
    }
  }, [filtered, style])
  const copiedList = useMemo(() => {
    try {
      return formatBibliography(exportBooks, style)
    } catch {
      return { html: '', text: '', entries: [] }
    }
  }, [exportBooks, style])
  const byId = new Map(filtered.map((book) => [book.id, book]))
  const ordered = formatted.entries.length
    ? formatted.entries.map((entry) => byId.get(entry.id)!).filter(Boolean)
    : filtered
  const entryById = new Map(formatted.entries.map((entry) => [entry.id, entry]))
  const importPreview = useMemo(() => {
    if (!incoming) return null
    try {
      return mergeImport(library, incoming)
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Import could not be prepared.' }
    }
  }, [library, incoming])
  const chooseCollection = (id: string) => {
    setCollectionId(id)
    setSelected([])
    setQuery('')
  }
  const openCollection = (collection: Collection | 'new') => {
    setCollectionDialog(collection)
    setCollectionName(collection === 'new' ? '' : collection.name)
  }
  const commitCollection = () => {
    const name = collectionName.trim()
    if (!name || !collectionDialog) return
    try {
      const persisted = updateLibrary((current) => {
        const id = collectionDialog === 'new' ? crypto.randomUUID() : collectionDialog.id
        if (
          current.collections.some(
            (collection) =>
              collection.id !== id && collection.name.toLowerCase() === name.toLowerCase(),
          )
        )
          throw new Error('A collection with that name already exists.')
        if (collectionDialog === 'new' && current.collections.length >= 100)
          throw new Error('You can have up to 100 collections.')
        return {
          ...current,
          collections:
            collectionDialog === 'new'
              ? [...current.collections, { id, name }]
              : current.collections.map((collection) =>
                  collection.id === id ? { ...collection, name } : collection,
                ),
        }
      })
      setCollectionDialog(null)
      if (persisted)
        notify(
          collectionDialog === 'new'
            ? 'A new home for your ideas. Collection created.'
            : 'Collection renamed.',
        )
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not save collection.', 'error')
    }
  }
  const assign = () => {
    if (!assignId) return
    try {
      const persisted = updateLibrary((current) => ({
        ...current,
        references: current.references.map((book) =>
          selectedBooks.some((item) => item.id === book.id)
            ? {
                ...book,
                collectionIds: [...new Set([...book.collectionIds, assignId])],
                updatedAt: new Date().toISOString(),
              }
            : book,
        ),
      }))
      setAssignOpen(false)
      if (persisted) notify('References added to the collection.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not update collection.', 'error')
    }
  }
  const exportJson = () =>
    downloadFile(
      'citeright-references.json',
      serializeLibrary({
        version: 1,
        references: exportBooks,
        collections:
          collectionId === 'all' && !query && !selectedBooks.length
            ? library.collections
            : library.collections.filter((collection) =>
                exportBooks.some((book) => book.collectionIds.includes(collection.id)),
              ),
      }),
    )
  return (
    <div className="page library-page">
      <div className="page-heading">
        <div>
          <h1>
            Good ideas.
            <br />
            <span>Great company.</span>
          </h1>
          <p className="muted">A little home for everything you’ve been reading.</p>
        </div>
        <Button asChild>
          <Link to="/">
            <Plus size={18} />
            Find a reference
          </Link>
        </Button>
      </div>
      <div className="library-layout">
        <aside className="library-sidebar" aria-label="Reference collections">
          <button
            className={`collection-nav ${collectionId === 'all' ? 'active' : ''}`}
            onClick={() => chooseCollection('all')}
          >
            <BookMarked size={18} />
            <span>All references</span>
            <span>{library.references.length}</span>
          </button>
          <button
            className={`collection-nav ${collectionId === 'unfiled' ? 'active' : ''}`}
            onClick={() => chooseCollection('unfiled')}
          >
            <Archive size={18} />
            <span>Unfiled</span>
            <span>{library.references.filter((book) => !book.collectionIds.length).length}</span>
          </button>
          <div className="collection-sidebar-heading">
            <h2>Collections</h2>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Create collection"
              onClick={() => openCollection('new')}
            >
              <Plus size={17} />
            </Button>
          </div>
          {library.collections.map((collection) => (
            <div className="collection-nav-row" key={collection.id}>
              <button
                className={`collection-nav ${collectionId === collection.id ? 'active' : ''}`}
                onClick={() => chooseCollection(collection.id)}
              >
                <Folder size={17} />
                <span>{collection.name}</span>
                <span>
                  {
                    library.references.filter((book) => book.collectionIds.includes(collection.id))
                      .length
                  }
                </span>
              </button>
              <button
                className="collection-edit"
                aria-label={`Rename ${collection.name}`}
                onClick={() => openCollection(collection)}
              >
                <Pencil size={13} />
              </button>
            </div>
          ))}
          {!library.collections.length && (
            <p className="small muted collection-hint">
              Group your references by assignment, project, or whatever you’re curious about.
            </p>
          )}
          <button className="text-button new-collection" onClick={() => openCollection('new')}>
            <FolderPlus size={16} />
            New collection
          </button>
          <div className="backup-note">
            <Download size={20} />
            <h3>A backup is a good idea.</h3>
            <p>
              Your library lives in this browser. Export JSON to keep a copy or move to another
              device.
            </p>
            <button
              className="text-button"
              onClick={() =>
                downloadFile('citeright-library-backup.json', serializeLibrary(library))
              }
            >
              Back up full library
              <ArrowRight size={14} />
            </button>
          </div>
        </aside>
        <section className="library-main" aria-label="Saved references">
          <div className="section-heading">
            <div>
              <h2>
                {activeCollection?.name ||
                  (collectionId === 'unfiled' ? 'Unfiled references' : 'Your bookshelf')}
              </h2>
              <p className="small muted">
                {filtered.length} {filtered.length === 1 ? 'reference' : 'references'} ·
                Alphabetized by citation style
              </p>
            </div>
            <div className="button-row">
              {activeCollection && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete collection ${activeCollection.name}`}
                  onClick={() => setDeleteCollection(activeCollection)}
                >
                  <Trash2 size={16} />
                </Button>
              )}
              <div className="view-switch" role="group" aria-label="Library view">
                <button
                  aria-label="List view"
                  aria-pressed={view === 'list'}
                  onClick={() => setView('list')}
                >
                  <List size={18} />
                </button>
                <button
                  aria-label="Cover grid view"
                  aria-pressed={view === 'grid'}
                  onClick={() => setView('grid')}
                >
                  <LayoutGrid size={18} />
                </button>
              </div>
            </div>
          </div>
          <div className="library-toolbar">
            <div className="filter-search">
              <Search size={17} />
              <label htmlFor="library-search" className="sr-only">
                Filter saved references
              </label>
              <input
                id="library-search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setSelected([])
                }}
                placeholder="Find something on your shelf…"
              />
              {query && (
                <button aria-label="Clear filter" onClick={() => setQuery('')}>
                  <X size={15} />
                </button>
              )}
            </div>
            <StyleSelector />
          </div>
          <div className="library-actions">
            <div className="button-row">
              <CopyButton
                value={copiedList}
                label={
                  selectedBooks.length
                    ? `Copy selected (${selectedBooks.length})`
                    : 'Copy all references'
                }
              />
              <Button variant="ghost" size="sm" disabled={!exportBooks.length} onClick={exportJson}>
                <Download size={15} />
                JSON
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={!exportBooks.length}
                onClick={() => {
                  try {
                    downloadFile(
                      'citeright-references.bib',
                      exportBibtex(exportBooks),
                      'application/x-bibtex',
                    )
                  } catch {
                    notify('BibTeX export failed. Try JSON export to keep your metadata.', 'error')
                  }
                }}
              >
                BibTeX
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={importing}
              onClick={() => inputRef.current?.click()}
            >
              <Upload size={15} />
              {importing ? 'Reading…' : 'Import JSON'}
            </Button>
            <input
              className="sr-only"
              tabIndex={-1}
              ref={inputRef}
              type="file"
              accept=".json,application/json"
              aria-label="Import CiteRight JSON file"
              onChange={async (event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (!file) return
                setImporting(true)
                try {
                  if (file.size > 5 * 1024 * 1024)
                    throw new Error('Choose a JSON export smaller than 5 MB.')
                  setIncoming(parseImport(await file.text()))
                } catch (error) {
                  notify(
                    error instanceof Error ? error.message : 'This file could not be imported.',
                    'error',
                  )
                } finally {
                  setImporting(false)
                }
              }}
            />
          </div>
          {formatted.error && (
            <p role="alert" className="inline-error">
              {formatted.error}
            </p>
          )}
          {filtered.length > 0 && (
            <div className="selection-bar">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedBooks.length === filtered.length}
                  ref={(node) => {
                    if (node)
                      node.indeterminate =
                        selectedBooks.length > 0 && selectedBooks.length < filtered.length
                  }}
                  onChange={(event) =>
                    setSelected(event.target.checked ? filtered.map((book) => book.id) : [])
                  }
                />
                {selectedBooks.length ? `${selectedBooks.length} selected` : 'Select references'}
              </label>
              {selectedBooks.length > 0 && (
                <div className="button-row">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAssignId(library.collections[0]?.id || '')
                      setAssignOpen(true)
                    }}
                  >
                    <FolderPlus size={15} />
                    Add to collection
                  </Button>
                  {activeCollection && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        try {
                          const persisted = updateLibrary((current) => ({
                            ...current,
                            references: current.references.map((book) =>
                              selected.includes(book.id)
                                ? {
                                    ...book,
                                    collectionIds: book.collectionIds.filter(
                                      (id) => id !== activeCollection.id,
                                    ),
                                  }
                                : book,
                            ),
                          }))
                          setSelected([])
                          if (persisted)
                            notify(
                              'References removed from this collection. They remain in your library.',
                            )
                        } catch (error) {
                          notify(String(error), 'error')
                        }
                      }}
                    >
                      Unfile from here
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
          {filtered.length ? (
            <div className={view === 'grid' ? 'library-grid' : 'reference-list'}>
              {ordered.map((book) => (
                <article
                  className={`reference-row ${selected.includes(book.id) ? 'reference-selected' : ''}`}
                  key={book.id}
                >
                  <label className="reference-checkbox">
                    <input
                      type="checkbox"
                      aria-label={`Select ${book.title}`}
                      checked={selected.includes(book.id)}
                      onChange={(event) =>
                        setSelected((old) =>
                          event.target.checked
                            ? [...old, book.id]
                            : old.filter((id) => id !== book.id),
                        )
                      }
                    />
                  </label>
                  <Link to={`/editor/${book.id}`} className="reference-cover">
                    <BookCover id={book.coverId} title={book.title} small={view === 'list'} />
                  </Link>
                  <div className="reference-body">
                    <Link to={`/editor/${book.id}`} className="reference-title">
                      {book.title}
                    </Link>
                    <p className="reference-author">
                      {bookAuthors(book)}
                      {book.year ? ` · ${book.year}` : ''}
                    </p>
                    {entryById.has(book.id) && (
                      <div
                        className="citation-output reference-citation"
                        dangerouslySetInnerHTML={{ __html: entryById.get(book.id)!.html }}
                      />
                    )}
                    <div className="reference-tags">
                      <span>
                        {book.type === 'paper-conference'
                          ? 'Conference paper'
                          : book.type === 'article-journal'
                            ? 'Journal article'
                            : 'Book'}
                      </span>
                      {book.collectionIds
                        .map((id) => library.collections.find((collection) => collection.id === id))
                        .filter(Boolean)
                        .map((collection) => (
                          <span key={collection!.id}>
                            <Folder size={11} />
                            {collection!.name}
                          </span>
                        ))}
                    </div>
                  </div>
                  <div className="reference-tools">
                    <Button asChild variant="ghost" size="icon">
                      <Link to={`/editor/${book.id}`} aria-label={`Edit ${book.title}`}>
                        <Pencil size={16} />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${book.title}`}
                      onClick={() => removeBook(book.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state library-empty">
              <div className="empty-bookshelf" aria-hidden="true">
                <i />
                <i />
                <i />
                <span />
              </div>
              <h3>
                {query
                  ? 'Nothing here by that name.'
                  : library.references.length
                    ? 'A fresh shelf for fresh ideas.'
                    : 'Your next chapter starts here.'}
              </h3>
              <p>
                {query
                  ? 'Try another title or author, or clear your filter.'
                  : library.references.length
                    ? 'Select references from All references, then add them to this collection.'
                    : 'Find your first book or article, make its citation, and save it here. Your future self will thank you.'}
              </p>
              {query ? (
                <Button variant="outline" onClick={() => setQuery('')}>
                  Clear filter
                </Button>
              ) : (
                <Button asChild>
                  <Link to="/">
                    Discover a source
                    <ArrowRight size={17} />
                  </Link>
                </Button>
              )}
            </div>
          )}
          {!!filtered.length && (
            <p className="library-footnote">
              {selectedBooks.length
                ? 'Copy and exports use your selection.'
                : 'Copy and exports use the references shown here.'}{' '}
              JSON preserves editable details and collections; BibTeX is for reference managers.
            </p>
          )}
        </section>
      </div>
      <Dialog
        open={!!collectionDialog}
        onOpenChange={(open) => {
          if (!open) setCollectionDialog(null)
        }}
        title={collectionDialog === 'new' ? 'Make room for a new idea' : 'Rename collection'}
        description="Keep references together for an assignment, project, or subject."
      >
        <div className="field">
          <label htmlFor="collection-name">Collection name</label>
          <input
            id="collection-name"
            autoFocus
            maxLength={80}
            value={collectionName}
            onChange={(event) => setCollectionName(event.target.value)}
            placeholder="e.g. The big thesis"
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitCollection()
            }}
          />
        </div>
        <div className="dialog-actions">
          <Button variant="outline" onClick={() => setCollectionDialog(null)}>
            Cancel
          </Button>
          <Button disabled={!collectionName.trim()} onClick={commitCollection}>
            {collectionDialog === 'new' ? 'Create collection' : 'Save name'}
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={!!deleteCollection}
        onOpenChange={(open) => {
          if (!open) setDeleteCollection(null)
        }}
        title="Remove this collection?"
        description="Your references will stay in All references. Only the collection and its memberships are removed."
      >
        <p>
          <strong>{deleteCollection?.name}</strong>
        </p>
        <div className="dialog-actions">
          <Button variant="outline" onClick={() => setDeleteCollection(null)}>
            Keep collection
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (!deleteCollection) return
              try {
                const persisted = updateLibrary((current) => ({
                  ...current,
                  collections: current.collections.filter(
                    (collection) => collection.id !== deleteCollection.id,
                  ),
                  references: current.references.map((book) => ({
                    ...book,
                    collectionIds: book.collectionIds.filter((id) => id !== deleteCollection.id),
                  })),
                }))
                chooseCollection('all')
                setDeleteCollection(null)
                if (persisted) notify('Collection removed. Your references are still here.')
              } catch (error) {
                notify(String(error), 'error')
              }
            }}
          >
            Remove collection
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        title="Give these ideas a home"
        description={`Add ${selectedBooks.length} selected references to a collection. They can belong to more than one.`}
      >
        {library.collections.length ? (
          <>
            <div className="field">
              <label htmlFor="assign-collection">Collection</label>
              <select
                id="assign-collection"
                value={assignId}
                onChange={(event) => setAssignId(event.target.value)}
              >
                {library.collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="dialog-actions">
              <Button onClick={assign}>
                <Check size={16} />
                Add to collection
              </Button>
            </div>
          </>
        ) : (
          <>
            <p>Create a collection first, then add your selected references.</p>
            <Button
              onClick={() => {
                setAssignOpen(false)
                openCollection('new')
              }}
            >
              <Plus size={16} />
              Create collection
            </Button>
          </>
        )}
      </Dialog>
      <Dialog
        open={!!incoming}
        onOpenChange={(open) => {
          if (!open) setIncoming(null)
        }}
        title="Bring your references along"
        description="Review the import before it changes your library. Existing references will not be overwritten."
      >
        {importPreview &&
          ('error' in importPreview ? (
            <p role="alert" className="inline-error">
              <AlertCircle size={18} />
              {importPreview.error}
            </p>
          ) : (
            <>
              <div className="import-summary">
                <p>
                  <strong>{importPreview.added}</strong> new references
                </p>
                <p>
                  <strong>{importPreview.skipped}</strong> matching references skipped
                </p>
              </div>
              <p className="small muted">
                Collections with the same name are combined. Distinct editions stay separate.
              </p>
              <div className="dialog-actions">
                <Button variant="outline" onClick={() => setIncoming(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!incoming) return
                    try {
                      const persisted = updateLibrary(
                        (current) => mergeImport(current, incoming).library,
                      )
                      setIncoming(null)
                      if (persisted) notify('References imported. Welcome back to your research.')
                    } catch (error) {
                      notify(error instanceof Error ? error.message : 'Import failed.', 'error')
                    }
                  }}
                >
                  Import references
                  <ArrowRight size={16} />
                </Button>
              </div>
            </>
          ))}
      </Dialog>
    </div>
  )
}

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, X, BookOpen } from 'lucide-react'
import {
  emptyLibrary,
  findDuplicate,
  issuesFor,
  type Book,
  type CitationStyle,
  type Library,
  type Theme,
} from '../lib/model'
import {
  LIBRARY_KEY,
  readLibrary,
  readPreference,
  writeLibrary,
  writePreference,
} from '../lib/storage'
import { downloadFile } from '../lib/transfer'
import { Button } from '../components/ui/button'
import { Dialog } from '../components/ui/dialog'

type Toast = {
  message: string
  type: 'success' | 'error'
  action?: { label: string; run: () => void }
}
type AppContext = {
  library: Library
  style: CitationStyle
  setStyle: (style: CitationStyle) => void
  theme: Theme
  setTheme: (theme: Theme) => void
  notify: (message: string, type?: 'success' | 'error', action?: Toast['action']) => void
  saveBook: (book: Book, replaceId?: string) => { id: string; persisted: boolean }
  removeBook: (id: string) => void
  updateLibrary: (transform: (current: Library) => Library) => boolean
  animateSave: (from: DOMRect) => void
  storageError: string | null
}
const Context = createContext<AppContext | null>(null)
export function useApp() {
  const context = useContext(Context)
  if (!context) throw new Error('App provider is missing.')
  return context
}
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(readLibrary)
  const current = useRef(state)
  current.current = state
  const [style, setStyleState] = useState<CitationStyle>(() =>
    readPreference('style', ['apa', 'mla'], 'apa'),
  )
  const [theme, setThemeState] = useState<Theme>(() =>
    readPreference('theme', ['system', 'light', 'dark'], 'system'),
  )
  const [toast, setToast] = useState<Toast | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [flight, setFlight] = useState<{
    x: number
    y: number
    dx: number
    dy: number
    key: number
  } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const flightTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const notify: AppContext['notify'] = (message, type = 'success', action) => {
    clearTimeout(toastTimer.current)
    setToast({ message, type, action })
    toastTimer.current = setTimeout(() => setToast(null), action || type === 'error' ? 12000 : 5500)
  }
  useEffect(
    () => () => {
      clearTimeout(toastTimer.current)
      clearTimeout(flightTimer.current)
    },
    [],
  )
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () =>
      document.documentElement.classList.toggle(
        'dark',
        theme === 'dark' || (theme === 'system' && media.matches),
      )
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [theme])
  useEffect(() => {
    const handler = (event: StorageEvent) => {
      if (event.key !== LIBRARY_KEY && event.key !== null) return
      if (current.current.error) {
        setState((old) => ({
          ...old,
          error:
            'Another tab changed the library while this tab has unsaved data. Export this tab as JSON before reloading.',
        }))
        return
      }
      const next = readLibrary()
      current.current = next
      setState(next)
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])
  const updateLibrary: AppContext['updateLibrary'] = (transform) => {
    if (current.current.corrupt)
      throw new Error(
        'Recover or reset the unreadable library before saving. Your original data is protected.',
      )
    const library = transform(current.current.library)
    const error = writeLibrary(library)
    const next = { library, error, corrupt: false }
    current.current = next
    setState(next)
    if (error) notify(error, 'error')
    return !error
  }
  const saveBook: AppContext['saveBook'] = (book, replaceId) => {
    const errors = issuesFor(book).filter((issue) => issue.severity === 'error')
    if (errors.length) throw new Error(errors[0].message)
    const id = replaceId || book.id
    const persisted = updateLibrary((library) => {
      const existing = library.references.find((item) => item.id === id)
      if (!existing && library.references.length >= 5000)
        throw new Error(
          'This library has reached 5,000 references. Export a backup before removing entries.',
        )
      const next = {
        ...book,
        id,
        authors: book.authors.filter(
          (author) => author.given.trim() || author.family.trim() || author.literal.trim(),
        ),
        collectionIds: book.collectionIds.filter((collectionId) =>
          library.collections.some((collection) => collection.id === collectionId),
        ),
        createdAt: existing?.createdAt || book.createdAt,
        updatedAt: new Date().toISOString(),
      }
      if (
        findDuplicate(
          next,
          library.references.filter((item) => item.id !== book.id && item.id !== replaceId),
        )
      )
        throw new Error(
          'A matching reference is already in your library. Open it instead or review the duplicate.',
        )
      return {
        ...library,
        references: [
          ...library.references.filter((item) => item.id !== id && item.id !== book.id),
          next,
        ],
      }
    })
    return { id, persisted }
  }
  const removeBook = (id: string) => {
    const removed = current.current.library.references.find((book) => book.id === id)
    if (!removed) return
    try {
      const persisted = updateLibrary((library) => ({
        ...library,
        references: library.references.filter((book) => book.id !== id),
      }))
      if (persisted)
        notify('Reference removed.', 'success', {
          label: 'Undo',
          run: () => {
            try {
              saveBook(removed)
              notify('Reference restored.')
            } catch (error) {
              notify(String(error), 'error')
            }
          },
        })
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not delete this reference.', 'error')
    }
  }
  const animateSave = (from: DOMRect) => {
    const destination = document.querySelector('[data-library-link]')?.getBoundingClientRect()
    if (!destination) return
    clearTimeout(flightTimer.current)
    setFlight({
      x: from.x + from.width / 2,
      y: from.y,
      dx: destination.x + destination.width / 2 - from.x - from.width / 2,
      dy: destination.y - from.y,
      key: Date.now(),
    })
    flightTimer.current = setTimeout(() => setFlight(null), 900)
  }
  return (
    <Context.Provider
      value={{
        library: state.library,
        storageError: state.error,
        style,
        setStyle: (value) => {
          setStyleState(value)
          writePreference('style', value)
        },
        theme,
        setTheme: (value) => {
          setThemeState(value)
          writePreference('theme', value)
        },
        notify,
        saveBook,
        removeBook,
        updateLibrary,
        animateSave,
      }}
    >
      {state.error && (
        <div className="storage-warning" role="alert">
          <AlertCircle size={18} />
          <span>{state.error}</span>
          {state.corrupt && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  try {
                    downloadFile(
                      'citeright-recovery.txt',
                      localStorage.getItem(LIBRARY_KEY) || '',
                      'text/plain',
                    )
                  } catch {
                    notify('Storage is blocked; a recovery file could not be read.', 'error')
                  }
                }}
              >
                Download recovery
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setResetOpen(true)}>
                Start new library
              </Button>
            </>
          )}
        </div>
      )}
      {children}
      {flight && (
        <span
          key={flight.key}
          className="flying-book"
          aria-hidden="true"
          style={
            {
              left: flight.x,
              top: flight.y,
              '--flight-x': `${flight.dx}px`,
              '--flight-y': `${flight.dy}px`,
            } as React.CSSProperties
          }
        >
          <BookOpen size={24} />
        </span>
      )}
      <div className="toast-region" aria-live="polite" aria-atomic="true">
        {toast && (
          <div className={`toast ${toast.type === 'error' ? 'toast-error' : ''}`}>
            {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            <span>{toast.message}</span>
            {toast.action && (
              <button className="text-button" onClick={toast.action.run}>
                {toast.action.label}
              </button>
            )}
            <button
              className="toast-close"
              aria-label="Dismiss notification"
              onClick={() => setToast(null)}
            >
              <X size={17} />
            </button>
          </div>
        )}
      </div>
      <Dialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Start a new library?"
        description="This replaces unreadable saved data. Download a recovery copy first if you want to keep it."
      >
        <div className="dialog-actions">
          <Button variant="outline" onClick={() => setResetOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              const library = emptyLibrary()
              const error = writeLibrary(library)
              const next = { library, error, corrupt: false }
              current.current = next
              setState(next)
              setResetOpen(false)
            }}
          >
            Replace saved data
          </Button>
        </div>
      </Dialog>
    </Context.Provider>
  )
}

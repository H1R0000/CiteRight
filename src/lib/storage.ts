import { bookSchema, emptyLibrary, librarySchema, type Book, type Library } from './model'

export const LIBRARY_KEY = 'citeright:library:v1'
export const DRAFT_KEY = 'citeright:draft:v1'
export function readLibrary(): { library: Library; error: string | null; corrupt: boolean } {
  let raw: string | null
  try {
    raw = localStorage.getItem(LIBRARY_KEY)
  } catch {
    return {
      library: emptyLibrary(),
      error:
        'Browser storage could not be read. Existing data has not been overwritten. Download a recovery copy or explicitly start a new library.',
      corrupt: true,
    }
  }
  if (!raw) return { library: emptyLibrary(), error: null, corrupt: false }
  try {
    const data = librarySchema.safeParse(JSON.parse(raw))
    if (data.success) return { library: data.data, error: null, corrupt: false }
  } catch {
    /* Invalid JSON is corrupt data, not an unavailable storage API. */
  }
  return {
    library: emptyLibrary(),
    error:
      'Your saved library could not be read. Download a recovery copy before starting a new library.',
    corrupt: true,
  }
}
export function writeLibrary(library: Library): string | null {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(library))
    return null
  } catch {
    return 'Changes are only in memory: browser storage is full or unavailable. Export JSON now to keep your work.'
  }
}
export function readDraft(): Book | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const result = bookSchema.safeParse(JSON.parse(raw))
    return result.success ? result.data : null
  } catch {
    return null
  }
}
export function writeDraft(book: Book): boolean {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(book))
    return true
  } catch {
    return false
  }
}
export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* Saving remains available through JSON export. */
  }
}
export function readPreference<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  try {
    const value = localStorage.getItem(`citeright:${key}`)
    return allowed.includes(value as T) ? (value as T) : fallback
  } catch {
    return fallback
  }
}
export function writePreference(key: string, value: string): void {
  try {
    localStorage.setItem(`citeright:${key}`, value)
  } catch {
    /* Preferences can remain in memory. */
  }
}

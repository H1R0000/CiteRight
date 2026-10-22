import { findDuplicate, issuesFor, librarySchema, type Library } from './model'
import type { Formatted } from './citations'

export function downloadFile(filename: string, content: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function serializeLibrary(library: Library): string {
  return JSON.stringify({ ...library, exportedAt: new Date().toISOString() }, null, 2)
}
export function parseImport(raw: string): Library {
  if (new Blob([raw]).size > 5 * 1024 * 1024)
    throw new Error('Choose a CiteRight JSON export smaller than 5 MB.')
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error('This file is not valid JSON. Choose a JSON file exported from CiteRight.')
  }
  const result = librarySchema.safeParse(data)
  if (!result.success)
    throw new Error(
      'This is not a supported CiteRight version 1 export. Your library has not changed.',
    )
  const library = result.data
  if (
    new Set(library.references.map((book) => book.id)).size !== library.references.length ||
    new Set(library.collections.map((collection) => collection.id)).size !==
      library.collections.length
  )
    throw new Error('The file contains repeated IDs. Your library has not changed.')
  if (
    library.references.some((book) => issuesFor(book).some((issue) => issue.severity === 'error'))
  )
    throw new Error(
      'Some references contain invalid titles, dates, ISBNs, DOIs, or URLs. Correct the export before importing.',
    )
  const collectionIds = new Set(library.collections.map((collection) => collection.id))
  if (library.references.some((book) => book.collectionIds.some((id) => !collectionIds.has(id))))
    throw new Error('A reference points to a missing collection. Your library has not changed.')
  return library
}
export function mergeImport(
  current: Library,
  incoming: Library,
): { library: Library; added: number; skipped: number } {
  const library: Library = {
    version: 1,
    references: [...current.references],
    collections: [...current.collections],
  }
  const ids = new Map<string, string>()
  for (const collection of incoming.collections) {
    const existing = library.collections.find(
      (item) => item.name.toLocaleLowerCase() === collection.name.toLocaleLowerCase(),
    )
    const id = existing?.id ?? crypto.randomUUID()
    ids.set(collection.id, id)
    if (!existing) library.collections.push({ ...collection, id })
  }
  let added = 0
  let skipped = 0
  for (const source of incoming.references) {
    const book = {
      ...source,
      id: crypto.randomUUID(),
      collectionIds: source.collectionIds.map((id) => ids.get(id)!).filter(Boolean),
    }
    if (findDuplicate(book, library.references)) {
      skipped++
      continue
    }
    library.references.push(book)
    added++
  }
  if (library.references.length > 5000 || library.collections.length > 100)
    throw new Error(
      'This import exceeds the limit of 5,000 references or 100 collections. Export a backup and reduce your library first.',
    )
  return { library, added, skipped }
}
export async function copyFormatted(value: Formatted): Promise<'rich' | 'plain'> {
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    const root = document.createElement('div')
    root.innerHTML = value.html // Only sanitized CSL output reaches this function.
    root.querySelectorAll<HTMLElement>('.csl-entry').forEach((entry) => {
      entry.style.paddingLeft = '2em'
      entry.style.textIndent = '-2em'
      entry.style.marginBottom = '1em'
    })
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([root.innerHTML], { type: 'text/html' }),
          'text/plain': new Blob([value.text], { type: 'text/plain' }),
        }),
      ])
      return 'rich'
    } catch {
      /* Some browsers only support plain text. */
    }
  }
  if (!navigator.clipboard?.writeText)
    throw new Error(
      'Clipboard access is unavailable. Select the citation text and copy it manually.',
    )
  await navigator.clipboard.writeText(value.text)
  return 'plain'
}

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, FileText, LoaderCircle, Plus } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Dialog } from '../../components/ui/dialog'
import { useApp } from '../../app/AppProvider'
import { lookupArticle } from '../../lib/crossref'
import { bookAuthors, newBook, type Book } from '../../lib/model'
import { readDraft, writeDraft } from '../../lib/storage'

export function ArticleLookup() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [article, setArticle] = useState<Book | null>(null)
  const [pending, setPending] = useState<Book | null>(null)
  const controller = useRef<AbortController | null>(null)
  const navigate = useNavigate()
  const { notify } = useApp()
  useEffect(() => () => controller.current?.abort(), [])
  async function search(event: FormEvent) {
    event.preventDefault()
    controller.current?.abort()
    const active = new AbortController()
    controller.current = active
    setLoading(true)
    setError('')
    setArticle(null)
    try {
      const result = await lookupArticle(input, active.signal)
      if (!active.signal.aborted) setArticle(result)
    } catch (error) {
      if (!active.signal.aborted)
        setError(
          error instanceof Error ? error.message : 'Could not find this article. Try manual entry.',
        )
    } finally {
      if (!active.signal.aborted) setLoading(false)
    }
  }
  function open(record: Book, replace = false) {
    if (!replace && readDraft()?.title.trim()) {
      setPending(record)
      return
    }
    if (!writeDraft(record))
      notify(
        'Your browser could not save this draft. Keep this tab open until you export or save it.',
        'error',
      )
    navigate('/editor/new', { state: { book: record } })
  }
  return (
    <div className="article-lookup">
      <form
        className="search-form"
        onSubmit={(event) => void search(event)}
        role="search"
        aria-label="Research paper lookup"
      >
        <label htmlFor="article-doi" className="doi-label">
          Paste the paper’s DOI or DOI link
        </label>
        <div className="search-box">
          <FileText size={22} aria-hidden="true" />
          <input
            id="article-doi"
            value={input}
            maxLength={600}
            autoComplete="off"
            spellCheck={false}
            aria-describedby="article-doi-hint"
            aria-invalid={!!error}
            placeholder="10.1037/ppm0000185"
            onChange={(event) => {
              controller.current?.abort()
              setLoading(false)
              setInput(event.target.value)
              setArticle(null)
              setError('')
            }}
          />
          <Button type="submit" disabled={!input.trim() || loading} aria-label="Find paper">
            <span>Find paper</span>
            {loading ? <LoaderCircle className="spin" size={19} /> : <ArrowRight size={19} />}
          </Button>
        </div>
        <p id="article-doi-hint" className="field-hint">
          Found a paper on Google Scholar? Open its publisher page and copy the DOI. Scholar result
          links and PDFs cannot be imported here.
        </p>
      </form>
      <div className="article-actions">
        <span className="small muted">Journals & conference papers · Crossref</span>
        <button className="text-button" onClick={() => open(newBook('article-journal'))}>
          <Plus size={16} />
          Enter paper manually
        </button>
      </div>
      {loading && (
        <p role="status" className="small">
          Looking up your paper…
        </p>
      )}
      {error && (
        <p role="alert" className="field-error article-error">
          {error}
        </p>
      )}
      {article && (
        <section className="article-result" aria-label="Paper match" aria-live="polite">
          <span className="badge badge-mint">
            {article.type === 'paper-conference' ? 'Conference paper' : 'Journal article'} · DOI
            match
          </span>
          <h2>{article.title || 'Title unavailable'}</h2>
          <p>{bookAuthors(article)}</p>
          <p>
            {(article.type === 'paper-conference' ? article.proceedings : article.journal) ||
              'Publication unavailable'}{' '}
            · {article.year || 'Year unavailable'}
          </p>
          <Button onClick={() => open(article)}>
            Review paper
            <ArrowRight size={16} />
          </Button>
        </section>
      )}
      <Dialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
        title="Keep your current draft?"
        description="You have an unfinished citation. Resume it, or replace it with this paper. Saved references stay in your library."
      >
        <div className="dialog-actions">
          <Button variant="outline" onClick={() => navigate('/editor/new')}>
            Resume draft
          </Button>
          <Button
            onClick={() => {
              if (pending) open(pending, true)
            }}
          >
            Replace draft
          </Button>
        </div>
      </Dialog>
    </div>
  )
}

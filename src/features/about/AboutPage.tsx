import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ExternalLink,
  BookOpen,
  ShieldCheck,
  Code2 as Github,
  Heart,
  Check,
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { siteConfig } from '../../config'
export default function AboutPage() {
  return (
    <div className="page about-page">
      <section className="about-hero">
        <span className="about-symbol" aria-hidden="true">
          ”
        </span>
        <h1>
          For the ideas
          <br />
          <span>worth sharing.</span>
        </h1>
        <p>
          CiteRight takes a little of the busywork out of writing, so you can spend more time making
          your point.
        </p>
        <Button asChild>
          <Link to="/">
            Find your next reference
            <ArrowRight size={17} />
          </Link>
        </Button>
      </section>
      <div className="about-content">
        <section>
          <h2>
            <BookOpen size={24} />A small tool. A useful purpose.
          </h2>
          <p>
            Find a book and its edition, or look up a journal article or conference paper by DOI,
            and create an APA 7 or MLA 9 citation. Make a collection for your paper, copy a
            reference list, and carry on with your work.
          </p>
          <p>
            Citation.js and the Citation Style Language processor handle formatting. Open Library
            supplies community-maintained book records. Crossref supplies publisher-deposited
            journal article metadata. You stay in control of the details.
          </p>
          <div className="about-pills">
            <span>
              <Check size={14} />
              Free to use
            </span>
            <span>
              <Check size={14} />
              No registration
            </span>
            <span>
              <Check size={14} />
              No paid APIs
            </span>
          </div>
        </section>
        <section>
          <h2>
            <ShieldCheck size={24} />
            Your library stays with you.
          </h2>
          <p>
            References, collections, drafts, preferences, and recent search responses are stored in
            this browser. CiteRight has no account system, cloud database, or analytics.
          </p>
          <p>
            Searching sends your query to Open Library; displaying book covers contacts its cover
            service. Article lookup sends the DOI to Crossref. Those services receive the usual
            network information. Fonts and citation styles are bundled with the app.
          </p>
          <p>
            Browser data can be cleared, and different browsers or website addresses have separate
            libraries. Export a JSON backup regularly. You can import that file on another device or
            into your local installation.
          </p>
        </section>
        <section>
          <h2>A little care goes a long way.</h2>
          <p>
            Community metadata can be incomplete or incorrect. Always check the book’s title and
            copyright pages, especially the edition, author names, publication year, and title
            capitalization. Readiness checks identify missing details; they do not certify accuracy.
          </p>
          <p>
            This release supports whole authored books, ebooks, journal articles, and papers
            published in conference proceedings, with parenthetical citations and optional page
            numbers. Chapters, edited volumes, translations requiring contributor credits, and
            narrative citations need additional handling outside this editor. Follow your
            instructor’s requirements.
          </p>
          <p>
            For a paper found on Google Scholar, open its publisher page and copy the DOI into the
            Research papers search. Journal articles and published proceedings papers registered
            with Crossref can be looked up automatically. Papers without a DOI can be entered
            manually. Scholar links, PDFs, preprints, unpublished presentations, and theses are not
            imported. Check the final published version; special formats such as retractions and
            advance online publication need additional review.
          </p>
          <p>
            Automatic name splitting is a starting point for review. Use the organization/full-name
            control for institutions, mononyms, or names that don’t fit given/family fields. Missing
            information is never invented.
          </p>
          <div className="about-source-links">
            <a
              href="https://apastyle.apa.org/style-grammar-guidelines/references/examples/book-references"
              target="_blank"
              rel="noreferrer"
            >
              APA book examples
              <ExternalLink size={14} />
            </a>
            <a
              href="https://style.mla.org/works-cited/citations-by-format/"
              target="_blank"
              rel="noreferrer"
            >
              MLA citation examples
              <ExternalLink size={14} />
            </a>
          </div>
        </section>
        <section id="open-source">
          <h2>
            <Github size={24} />
            Open by design.
          </h2>
          <p>
            CiteRight is built with React, TypeScript, Vite, Tailwind CSS, and shadcn/ui. The
            application code is MIT licensed. The same source runs on Vercel or locally with Node.js
            and npm.
          </p>
          {siteConfig.repositoryUrl ? (
            <a
              href={siteConfig.repositoryUrl}
              target="_blank"
              rel="noreferrer"
              className="button button-outline"
            >
              <Github size={17} />
              Explore on GitHub
              <ExternalLink size={14} />
            </a>
          ) : (
            <p className="source-pending">
              The public GitHub repository has not been linked yet. This build is prepared for
              publication; its source link will appear here when configured.
            </p>
          )}
          <p>
            Book metadata and covers are provided by{' '}
            <a href="https://openlibrary.org" target="_blank" rel="noreferrer">
              Open Library
            </a>
            , an Internet Archive initiative. Article metadata is provided by{' '}
            <a href="https://www.crossref.org" target="_blank" rel="noreferrer">
              Crossref
            </a>
            . Citation formatting uses{' '}
            <a href="https://citation.js.org" target="_blank" rel="noreferrer">
              Citation.js
            </a>{' '}
            and official{' '}
            <a
              href="https://github.com/citation-style-language/styles"
              target="_blank"
              rel="noreferrer"
            >
              CSL styles
            </a>
            . Bundled styles retain their Creative Commons Attribution-ShareAlike license.
          </p>
        </section>
      </div>
      <div className="about-signoff">
        <Heart size={19} />
        <p>Made for curious minds and very long reading lists.</p>
      </div>
    </div>
  )
}

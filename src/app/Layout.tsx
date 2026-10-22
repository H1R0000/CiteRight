import { useEffect } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { BookMarked, Code2 as Github, ArrowUpRight } from 'lucide-react'
import { useApp } from './AppProvider'
import { StyleSelector } from '../components/StyleSelector'
import { ThemeMenu } from '../components/ThemeMenu'
import { siteConfig } from '../config'
export function Layout() {
  const { library } = useApp()
  const location = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    document.title = `${location.pathname.startsWith('/library') ? 'Your library' : location.pathname.startsWith('/editor') ? 'Citation studio' : location.pathname === '/about' ? 'About' : 'Less formatting. More ideas.'} · CiteRight`
  }, [location.pathname])
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="brand" aria-label="CiteRight home">
            <span className="brand-mark" aria-hidden="true">
              ”
            </span>
            Cite<span>Right</span>
            <span className="brand-dot" />
          </Link>
          <nav aria-label="Main navigation">
            <NavLink to="/" end>
              Discover
            </NavLink>
            <NavLink to="/library" data-library-link>
              <BookMarked size={17} />
              My library
              <span className="library-count" key={library.references.length}>
                {library.references.length}
              </span>
            </NavLink>
            <NavLink to="/about">About</NavLink>
          </nav>
          <div className="header-tools">
            <StyleSelector />
            <ThemeMenu />
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <Link className="footer-brand" to="/">
          CiteRight<span>Good ideas. Proper credit.</span>
        </Link>
        <div className="footer-links">
          <a href="https://openlibrary.org" target="_blank" rel="noreferrer">
            Powered by Open Library
            <ArrowUpRight size={13} />
          </a>
          {siteConfig.repositoryUrl ? (
            <a href={siteConfig.repositoryUrl} target="_blank" rel="noreferrer">
              <Github size={15} />
              GitHub
            </a>
          ) : (
            <Link to="/about#open-source">
              <Github size={15} />
              Open source
            </Link>
          )}
          <span>No accounts. All yours.</span>
          <a href="https://github.com/Juris-M/citeproc-js" target="_blank" rel="noreferrer">
            citeproc-js © Frank Bennett
          </a>
        </div>
      </footer>
    </>
  )
}

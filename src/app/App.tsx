import { lazy, Suspense, Component, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { AppProvider } from './AppProvider'
import { Layout } from './Layout'
import { SearchPage } from '../features/search/SearchPage'
const EditorPage = lazy(() => import('../features/editor/EditorPage'))
const LibraryPage = lazy(() => import('../features/library/LibraryPage'))
const AboutPage = lazy(() => import('../features/about/AboutPage'))
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (
      <div className="page empty-state">
        <h1>Something interrupted your workspace.</h1>
        <p>Your saved references are still in this browser. Reload to try again.</p>
        <button className="button button-primary" onClick={() => window.location.reload()}>
          Reload CiteRight
        </button>
      </div>
    ) : (
      this.props.children
    )
  }
}
export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <BrowserRouter>
          <Suspense
            fallback={
              <div className="page route-loading" role="status">
                <span className="spinner" />
                Opening your workspace…
              </div>
            }
          >
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<SearchPage />} />
                <Route path="editor/:id" element={<EditorPage />} />
                <Route path="library" element={<LibraryPage />} />
                <Route path="about" element={<AboutPage />} />
                <Route
                  path="*"
                  element={
                    <div className="page empty-state">
                      <h1>This page wandered off.</h1>
                      <Link to="/" className="button button-primary">
                        Back to discovering books
                      </Link>
                    </div>
                  }
                />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AppProvider>
    </ErrorBoundary>
  )
}

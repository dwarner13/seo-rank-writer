import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import LandingPage from './pages/LandingPage.tsx'
import PluginDownloads from './pages/PluginDownloads.tsx'
import BacklinkChecker from './pages/BacklinkChecker.tsx'
import SeoReport from './pages/SeoReport.tsx'

function Router() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const onNav = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onNav)
    return () => window.removeEventListener('popstate', onNav)
  }, [])

  // Intercept link clicks for client-side navigation
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a')
      if (!a) return
      const href = a.getAttribute('href')
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('tel:') || href.startsWith('mailto:')) return
      if (a.getAttribute('target') === '_blank') return
      e.preventDefault()
      window.history.pushState({}, '', href)
      setPath(href)
      window.scrollTo(0, 0)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  if (path === '/app') {
    return <App />
  }

  if (path === '/plugins') {
    return <PluginDownloads />
  }

  if (path === '/backlinks') {
    return <BacklinkChecker />
  }

  if (path === '/report') {
    return <SeoReport />
  }

  return <LandingPage />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router />
  </StrictMode>,
)

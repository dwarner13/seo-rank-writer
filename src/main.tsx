import { StrictMode, useState, useEffect, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AuthProvider, useAuth } from './lib/AuthContext.tsx'
import App from './App.tsx'
import LandingPage from './pages/LandingPage.tsx'
import PluginDownloads from './pages/PluginDownloads.tsx'
import BacklinkChecker from './pages/BacklinkChecker.tsx'
import SeoReport from './pages/SeoReport.tsx'
import LoginPage from './pages/LoginPage.tsx'
import SignupPage from './pages/SignupPage.tsx'

function Router() {
  const [path, setPath] = useState(window.location.pathname)
  const { user, loading, enabled } = useAuth()

  const navigate = useCallback((to: string) => {
    window.history.pushState({}, '', to)
    setPath(to)
    window.scrollTo(0, 0)
  }, [])

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
      navigate(href)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [navigate])

  // Auth loading state
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#64748b' }}>
        Loading...
      </div>
    )
  }

  // Protected route: /app requires auth (when Supabase is enabled)
  if (path === '/app') {
    if (enabled && !user) {
      // Redirect to login
      window.history.replaceState({}, '', '/login')
      return <LoginPage onNavigate={navigate} />
    }
    return <App />
  }

  // Auth pages
  if (path === '/login') {
    if (enabled && user) { navigate('/app'); return null }
    return <LoginPage onNavigate={navigate} />
  }

  if (path === '/signup') {
    if (enabled && user) { navigate('/app'); return null }
    return <SignupPage onNavigate={navigate} />
  }

  // Public pages
  if (path === '/plugins') return <PluginDownloads />
  if (path === '/backlinks') return <BacklinkChecker />
  if (path === '/report') return <SeoReport />

  return <LandingPage />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <Router />
    </AuthProvider>
  </StrictMode>,
)

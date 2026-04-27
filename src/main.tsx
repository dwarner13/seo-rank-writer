import { StrictMode, useState, useEffect, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AuthProvider, useAuth } from './lib/AuthContext.tsx'
import { PlanProvider } from './lib/PlanContext.tsx'
import App from './App.tsx'
import LandingPage from './pages/LandingPage.tsx'
import PluginDownloads from './pages/PluginDownloads.tsx'
import BacklinkChecker from './pages/BacklinkChecker.tsx'
import SeoReport from './pages/SeoReport.tsx'
import LoginPage from './pages/LoginPage.tsx'
import SignupPage from './pages/SignupPage.tsx'
import PrivacyPolicy from './pages/PrivacyPolicy.tsx'
import TermsOfService from './pages/TermsOfService.tsx'
import AuthCallback from './pages/AuthCallback.tsx'

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

  // After login completes, if we're on /login or /signup and now have user, redirect to /app
  useEffect(() => {
    if (!loading && enabled && user) {
      if (path === '/login' || path === '/signup') {
        console.log("[Auth] Redirecting authenticated user to /app")
        navigate('/app')
      }
    }
  }, [loading, enabled, user, path, navigate])

  // OAuth callback route — handle BEFORE loading check
  // This page does the code exchange itself and redirects to /app
  if (path === '/auth/callback') {
    return <AuthCallback onComplete={() => navigate('/app')} />
  }

  // Show loading spinner while auth is being checked
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#64748b', gap: 12 }}>
        <img src="/logo.png" alt="SEO Rank Writer" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'contain' as const }} />
        <span>Loading...</span>
      </div>
    )
  }

  // Protected route: /app requires auth (when Supabase is enabled)
  if (path === '/app') {
    if (enabled && !user) {
      console.log("[Auth] No session for /app, redirecting to /login")
      window.history.replaceState({}, '', '/login')
      return <LoginPage onNavigate={navigate} />
    }
    return <App />
  }

  // Auth pages — already logged in? go to app
  if (path === '/login') {
    if (enabled && user) return null // useEffect above handles redirect
    return <LoginPage onNavigate={navigate} />
  }

  if (path === '/signup') {
    if (enabled && user) return null
    return <SignupPage onNavigate={navigate} />
  }

  // Public pages
  if (path === '/plugins') return <PluginDownloads />
  if (path === '/backlinks') return <BacklinkChecker />
  if (path === '/report') return <SeoReport />
  if (path === '/privacy') return <PrivacyPolicy />
  if (path === '/terms') return <TermsOfService />

  return <LandingPage />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <PlanProvider>
        <Router />
      </PlanProvider>
    </AuthProvider>
  </StrictMode>,
)

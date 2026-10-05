import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import ConversationPage from './pages/ConversationPage'
import KnowledgePage from './pages/KnowledgePage'
import Login from './pages/Login'
import { hasSupabaseConfig, supabase } from './lib/supabase'

function ProtectedRoute({ isAuthenticated, children }) {
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function AppLayout({ user, onLogout, children }) {
  const navigate = useNavigate()
  const [logoutError, setLogoutError] = useState('')

  const handleLogout = async () => {
    setLogoutError('')
    try {
      await onLogout()
      navigate('/login')
    } catch (error) {
      setLogoutError(error.message || 'Unable to log out.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <nav className="flex items-center gap-6">
            <NavLink to="/" className={({ isActive }) => `text-sm font-medium ${isActive ? 'text-blue-600' : 'text-slate-700'}`}>
              Conversations
            </NavLink>
            <NavLink to="/knowledge" className={({ isActive }) => `text-sm font-medium ${isActive ? 'text-blue-600' : 'text-slate-700'}`}>
              Knowledge Base
            </NavLink>
          </nav>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{user?.email || 'Demo agent'}</span>
            <button type="button" onClick={handleLogout} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
              Logout
            </button>
          </div>
        </div>
      </header>
      {logoutError && <p role="alert" className="mx-auto mt-4 max-w-7xl rounded-lg bg-red-50 p-3 text-sm text-red-800">{logoutError}</p>}
      {children}
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(!hasSupabaseConfig)

  useEffect(() => {
    if (!supabase) return undefined

    let active = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error('Unable to restore authentication session:', error)
      if (active) {
        setUser(data.session?.user ?? null)
        setAuthReady(true)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthReady(true)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const handleLogin = async (credentials) => {
    if (!supabase) {
      setUser({ email: credentials.email })
      return
    }
    const { data, error } = await supabase.auth.signInWithPassword(credentials)
    if (error) throw error
    setUser(data.user)
  }

  const handleLogout = async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    }
    setUser(null)
  }

  if (!authReady) return <div className="p-8 text-center text-slate-600">Restoring session...</div>

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />} />
        <Route
          path="/"
          element={
            <ProtectedRoute isAuthenticated={Boolean(user)}>
              <AppLayout user={user} onLogout={handleLogout}><ConversationPage user={user} /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/knowledge"
          element={
            <ProtectedRoute isAuthenticated={Boolean(user)}>
              <AppLayout user={user} onLogout={handleLogout}><KnowledgePage /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

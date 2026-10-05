import { useState } from 'react'
import { hasSupabaseConfig } from '../lib/supabase'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await onLogin({ email, password })
    } catch (loginError) {
      setError(loginError.message || 'Unable to sign in.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Datastraw</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">CX Reply Assistant</h1>
        </div>
        {!hasSupabaseConfig && (
          <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Local demo mode: enter any email and password. Configure Supabase for real authentication.
          </p>
        )}
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input id="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500" />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500" />
          </div>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60">
            {isSubmitting ? 'Signing in...' : 'Log In'}
          </button>
        </div>
      </form>
    </div>
  )
}

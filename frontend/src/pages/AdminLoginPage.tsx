import { type FormEvent, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { SigaLogo } from '../components/SigaLogo'
import { useAdminAuth } from '../state/useAdminAuth'

const currentYear = new Date().getFullYear()

export function AdminLoginPage() {
  const { status, login } = useAdminAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const from = (location.state as { from?: string } | null)?.from || '/admin'

  if (status === 'authenticated') return <Navigate to={from} replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  return <div data-testid="admin-login-page" className="flex min-h-screen flex-col bg-sand-50"><header className="border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur"><div className="border-b border-navy-900 bg-navy-950 text-slate-200"><div className="mx-auto flex max-w-7xl items-center px-4 py-2 text-xs sm:px-6 lg:px-8"><span className="font-semibold tracking-wide">Specified Entities information service</span></div></div><div data-testid="admin-login-header-layout" className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:px-6 lg:px-8"><div className="min-w-0 justify-self-start sm:col-start-1 sm:row-start-1"><SigaLogo className="h-10 w-auto max-w-full sm:h-12" /></div><h1 data-testid="admin-login-header-title" className="justify-self-center whitespace-nowrap text-center text-xl font-black tracking-tight text-navy-950 sm:col-start-2 sm:row-start-1 sm:text-2xl">SIGA Registry</h1><p className="justify-self-end text-sm font-bold text-slate-600 sm:col-start-3 sm:row-start-1">Administrator</p></div></header><main className="flex flex-1 flex-col"><section className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-12 sm:px-6"><div data-testid="admin-login-card" className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><h2 className="text-3xl font-black tracking-tight text-navy-950">Administrator Sign In</h2>{error && <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{error}</p>}<form onSubmit={(event) => void submit(event)} className="mt-7 space-y-5"><div><label htmlFor="admin-email" className="text-sm font-bold text-slate-700">Email Address</label><input id="admin-email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-teal-700" /></div><div><label htmlFor="admin-password" className="text-sm font-bold text-slate-700">Password</label><input id="admin-password" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-teal-700" /></div><button type="submit" disabled={submitting} className="w-full rounded-lg bg-teal-700 px-4 py-3 font-bold text-white disabled:opacity-60 hover:bg-teal-600">{submitting ? 'Signing in…' : 'Sign in'}</button></form></div></section></main><footer data-testid="admin-login-footer" className="mt-auto border-t border-slate-200 bg-white text-slate-600"><div data-testid="admin-login-footer-content" className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-7 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><p>© {currentYear} State Interests and Governance Authority. All rights reserved.</p><p>Created by SIGA IT</p></div></footer></div>
}

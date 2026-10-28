import { type FormEvent, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { SigaLogo } from '../components/SigaLogo'
import { useAdminAuth } from '../state/useAdminAuth'

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

  return <main className="grid min-h-screen bg-sand-50 lg:grid-cols-2"><section className="hidden bg-navy-950 p-12 lg:flex lg:flex-col lg:justify-between"><Link to="/" className="min-w-0"><span className="inline-flex rounded-xl bg-white p-3 shadow-sm"><SigaLogo className="h-20 w-auto max-w-full" /></span></Link><div><p className="text-sm font-black tracking-[0.16em] text-teal-100 uppercase">Administrator access</p><h1 className="mt-4 max-w-md text-5xl font-black tracking-tight text-white">Manage the registry securely.</h1><p className="mt-6 max-w-md leading-7 text-slate-300"></p></div><p className="text-sm text-slate-400">Specified Entities information directory</p></section><section className="flex items-center justify-center px-4 py-12 sm:px-6"><div className="w-full max-w-md"><Link to="/" aria-label="SIGA Registry home" className="mb-6 flex w-fit lg:hidden"><SigaLogo className="h-12 w-auto max-w-full" /></Link><Link to="/" className="text-sm font-bold text-teal-700 hover:text-teal-600">← Back to public directory</Link><div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><p className="text-sm font-black tracking-[0.16em] text-teal-700 uppercase">Administrator sign in</p><h1 className="mt-2 text-3xl font-black tracking-tight text-navy-950">Welcome back</h1><p className="mt-3 text-sm leading-6 text-slate-600"></p>{error && <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{error}</p>}<form onSubmit={(event) => void submit(event)} className="mt-7 space-y-5"><div><label htmlFor="admin-email" className="text-sm font-bold text-slate-700">Email address</label><input id="admin-email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-teal-700" /></div><div><label htmlFor="admin-password" className="text-sm font-bold text-slate-700">Password</label><input id="admin-password" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-teal-700" /></div><button type="submit" disabled={submitting} className="w-full rounded-lg bg-teal-700 px-4 py-3 font-bold text-white disabled:opacity-60 hover:bg-teal-600">{submitting ? 'Signing in…' : 'Sign in'}</button></form></div></div></section></main>
}

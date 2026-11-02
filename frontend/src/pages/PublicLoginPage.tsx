import { type FormEvent, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { SigaLogo } from '../components/SigaLogo'
import { usePublicAuth } from '../state/usePublicAuth'

export function PublicLoginPage() {
  const { status, login } = usePublicAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authenticated') return <Navigate to="/directory" replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      const requestedPath = (location.state as { from?: unknown } | null)?.from
      navigate(typeof requestedPath === 'string' && requestedPath.startsWith('/') ? requestedPath : '/directory', { replace: true })
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  return <section className="mx-auto flex min-h-[calc(100vh-16rem)] max-w-md items-center px-4 py-12 sm:px-6"><div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><Link to="/" aria-label="SIGA Registry home" className="flex w-fit"><SigaLogo className="h-14 w-auto max-w-full" /></Link><h1 className="mt-7 text-3xl font-black tracking-tight text-navy-950">SIGA Registry</h1>{error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}<form onSubmit={(event) => void submit(event)} className="mt-7 space-y-5"><div><label htmlFor="public-login-email" className="text-sm font-bold text-slate-700">Email Address</label><input id="public-login-email" required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-teal-700" /></div><div><label htmlFor="public-login-password" className="text-sm font-bold text-slate-700">Password</label><div className="mt-2 flex rounded-lg border border-slate-300 bg-white focus-within:border-teal-700"><input id="public-login-password" required type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="min-w-0 grow rounded-l-lg px-3 py-2.5 text-sm outline-none" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="grid shrink-0 place-items-center px-3 text-teal-700 hover:text-teal-600" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? <EyeOff aria-hidden="true" size={20} /> : <Eye aria-hidden="true" size={20} />}</button></div></div><button type="submit" disabled={submitting} className="w-full rounded-lg bg-teal-700 px-4 py-3 font-bold text-white hover:bg-teal-600 disabled:opacity-60">Sign In</button></form><p className="mt-6 text-sm text-slate-600">New to SIGA Registry? <Link to="/register" className="font-bold text-teal-700 underline decoration-teal-700/30 underline-offset-4 hover:text-teal-600">Create Account</Link></p></div></section>
}

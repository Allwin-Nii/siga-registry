import { type FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { SigaLogo } from '../components/SigaLogo'
import { usePublicAuth } from '../state/usePublicAuth'

export function PublicRegistrationPage() {
  const { status, register } = usePublicAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authenticated') return <Navigate to="/directory" replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (password !== confirmation) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      await register(email, password)
      navigate('/directory', { replace: true })
    } catch (registrationError) {
      setError(registrationError instanceof Error ? registrationError.message : 'Unable to create the account.')
    } finally {
      setSubmitting(false)
    }
  }

  return <section className="mx-auto flex min-h-[calc(100vh-16rem)] max-w-md items-center px-4 py-12 sm:px-6"><div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><Link to="/" aria-label="SIGA Registry home" className="flex w-fit"><SigaLogo className="h-14 w-auto max-w-full" /></Link><h1 className="mt-7 text-3xl font-black tracking-tight text-navy-950">Create your SIGA Registry account</h1>{error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}<form onSubmit={(event) => void submit(event)} className="mt-7 space-y-5"><div><label htmlFor="public-register-email" className="text-sm font-bold text-slate-700">Email Address</label><input id="public-register-email" required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-teal-700" /></div><div><label htmlFor="public-register-password" className="text-sm font-bold text-slate-700">Password</label><div className="mt-2 flex rounded-lg border border-slate-300 bg-white focus-within:border-teal-700"><input id="public-register-password" required minLength={12} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="min-w-0 grow rounded-l-lg px-3 py-2.5 text-sm outline-none" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="shrink-0 px-3 text-sm font-bold text-teal-700 hover:text-teal-600" aria-pressed={showPassword}>{showPassword ? 'Hide password' : 'Show password'}</button></div></div><div><label htmlFor="public-register-confirmation" className="text-sm font-bold text-slate-700">Confirm Password</label><input id="public-register-confirmation" required minLength={12} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-teal-700" /></div><button type="submit" disabled={submitting} className="w-full rounded-lg bg-teal-700 px-4 py-3 font-bold text-white hover:bg-teal-600 disabled:opacity-60">{submitting ? 'Creating account…' : 'Create Account'}</button></form><p className="mt-6 text-sm text-slate-600">Already have an account? <Link to="/login" className="font-bold text-teal-700 underline decoration-teal-700/30 underline-offset-4 hover:text-teal-600">Sign In</Link></p></div></section>
}

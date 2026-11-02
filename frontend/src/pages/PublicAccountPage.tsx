import { Link, Navigate } from 'react-router-dom'
import { usePublicAuth } from '../state/usePublicAuth'

export function PublicAccountPage() {
  const { status, session } = usePublicAuth()
  if (status === 'checking') return <div className="mx-auto max-w-3xl px-4 py-20 text-center" role="status">Checking your public account…</div>
  if (status !== 'authenticated' || !session) return <Navigate to="/login" replace />

  return <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><p className="text-sm font-black tracking-[0.16em] text-teal-700 uppercase">My Account</p><h1 className="mt-2 text-3xl font-black tracking-tight text-navy-950">SIGA Registry account</h1><p className="mt-5 text-slate-700">Signed in as <span className="font-bold">{session.publicUser.email}</span></p><Link to="/directory" className="mt-7 inline-flex rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-600">Browse Entities</Link></div></section>
}

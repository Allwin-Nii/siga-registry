import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../state/useAdminAuth'

export function AdminRoute() {
  const { status, error, refreshSession } = useAdminAuth()
  const location = useLocation()

  if (status === 'checking') {
    return <main className="mx-auto max-w-3xl px-4 py-20 text-center" role="status"><h1 className="text-3xl font-black text-navy-950">Checking administrator access…</h1><p className="mt-3 text-slate-600">Restoring your secure server-managed session.</p></main>
  }
  if (status === 'anonymous') return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  if (status === 'error') {
    return <main className="mx-auto max-w-3xl px-4 py-20 text-center" role="alert"><h1 className="text-3xl font-black text-navy-950">Administrator access is unavailable</h1><p className="mt-3 text-slate-600">{error?.message}</p><button type="button" onClick={() => void refreshSession()} className="mt-6 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-bold text-white">Retry</button></main>
  }
  return <Outlet />
}

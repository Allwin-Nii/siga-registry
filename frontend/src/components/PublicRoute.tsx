import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { usePublicAuth } from '../state/usePublicAuth'

export function PublicRoute() {
  const { status } = usePublicAuth()
  const location = useLocation()

  if (status === 'checking') return <div className="mx-auto max-w-3xl px-4 py-20 text-center" role="status">Checking your sign-in session…</div>
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  }
  return <Outlet />
}

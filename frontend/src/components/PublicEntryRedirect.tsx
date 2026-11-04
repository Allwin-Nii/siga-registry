import { Navigate } from 'react-router-dom'
import { usePublicAuth } from '../state/usePublicAuth'

export function PublicEntryRedirect() {
  const { status } = usePublicAuth()
  if (status === 'checking') return <div className="mx-auto max-w-3xl px-4 py-20 text-center" role="status">Checking your sign-in session…</div>
  return <Navigate to={status === 'authenticated' ? '/dashboard' : '/login'} replace />
}

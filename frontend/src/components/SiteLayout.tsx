import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { SigaLogo } from './SigaLogo'
import { usePublicAuth } from '../state/usePublicAuth'

const navItem = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-bold transition ${isActive ? 'bg-teal-100 text-teal-800' : 'text-slate-600 hover:bg-slate-100 hover:text-navy-900'}`

export function SiteLayout() {
  const { status, logout } = usePublicAuth()
  const navigate = useNavigate()

  const signOut = async () => {
    try {
      await logout()
    } catch {
      // PublicAuthProvider has already cleared client state; the next sign-in restores a verified session only.
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-sand-50">
      <a className="sr-only focus:not-sr-only focus:absolute focus:left-5 focus:top-5 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2" href="#main-content">Skip to content</a>
      <header className="border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="border-b border-navy-900 bg-navy-950 text-slate-200">
          <div className="mx-auto flex max-w-7xl items-center px-4 py-2 text-xs sm:px-6 lg:px-8">
            <span className="font-semibold tracking-wide">Specified Entities information service</span>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <NavLink to="/" className="min-w-0" aria-label="SIGA Registry home"><SigaLogo className="h-10 w-auto max-w-full sm:h-12" /></NavLink>
          <nav aria-label="Primary navigation" className="order-3 flex w-full items-center gap-1 overflow-x-auto pb-1 sm:order-2 sm:w-auto sm:pb-0">
            {status === 'authenticated'
              ? <><NavLink to="/directory" className={navItem}>Entities</NavLink><button type="button" onClick={() => void signOut()} className="rounded-md px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-navy-900">Sign Out</button></>
              : <NavLink to="/login" className={navItem}>Sign In</NavLink>}
          </nav>
        </div>
      </header>
      <main id="main-content"><Outlet /></main>
      <footer className="mt-16 border-t border-navy-900 bg-navy-950 text-slate-300">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-sm font-bold text-white">Official reference</p><a className="mt-3 inline-flex text-sm font-semibold text-teal-100 underline decoration-teal-600 underline-offset-4 hover:text-white" href="https://siga.gov.gh/" target="_blank" rel="noopener noreferrer">Visit the official SIGA website <span aria-hidden="true">↗</span></a>
        </div>
      </footer>
    </div>
  )
}

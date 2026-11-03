import { Building2, LayoutDashboard, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { SigaLogo } from './SigaLogo'
import { useAdminAuth } from '../state/useAdminAuth'

const navigationItems = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/establishments', label: 'Entities', icon: Building2, end: false },
]

export function AdminLayout() {
  const { session, logout } = useAdminAuth()
  const navigate = useNavigate()
  const [signOutError, setSignOutError] = useState('')
  const [navigationOpen, setNavigationOpen] = useState(false)

  const signOut = async () => {
    try {
      setSignOutError('')
      await logout()
      navigate('/admin/login', { replace: true })
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : 'Unable to sign out. Please try again.')
    }
  }

  const topNavigation = (mobile = false) => <nav aria-label="Administrator navigation" className={mobile ? 'space-y-1' : 'hidden items-center gap-1 md:flex'}>{navigationItems.map((item) => {
    const Icon = item.icon
    return <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setNavigationOpen(false)} className={({ isActive }) => `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${isActive ? 'bg-teal-100 text-teal-800' : mobile ? 'text-slate-600 hover:bg-slate-100 hover:text-navy-950' : 'text-slate-600 hover:bg-slate-100 hover:text-navy-950'}`}><Icon className="h-4 w-4" aria-hidden="true" />{item.label}</NavLink>
  })}</nav>

  return <div className="min-h-screen bg-slate-100">
    <header className="border-b border-slate-200 bg-white shadow-sm"><div className="mx-auto flex h-16 max-w-360 items-center gap-4 px-4 sm:px-6 lg:px-8"><Link to="/admin" className="shrink-0 rounded-md"><SigaLogo className="h-9 w-auto" /></Link><div className="min-w-0 flex-1">{topNavigation()}</div><div className="flex shrink-0 items-center gap-3"><span className="hidden max-w-60 truncate text-sm text-slate-500 lg:block" title={session?.administrator.email}>Signed in as <strong className="font-bold text-navy-950">{session?.administrator.email}</strong></span><button type="button" onClick={() => void signOut()} className="hidden items-center gap-2 rounded-lg border border-navy-900 px-3 py-2 text-sm font-bold text-navy-900 transition hover:bg-navy-950 hover:text-white sm:flex"><LogOut className="h-4 w-4" aria-hidden="true" />Sign out</button><button type="button" onClick={() => setNavigationOpen((open) => !open)} aria-expanded={navigationOpen} aria-controls="administrator-mobile-navigation" className="rounded-lg border border-slate-200 p-2 text-navy-950 md:hidden"><span className="sr-only">{navigationOpen ? 'Close' : 'Open'} administrator navigation</span>{navigationOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}</button></div></div>{navigationOpen && <div id="administrator-mobile-navigation" className="border-t border-slate-200 px-4 py-3 md:hidden">{topNavigation(true)}<button type="button" onClick={() => void signOut()} className="mt-3 flex items-center gap-2 rounded-lg border border-navy-900 px-3 py-2 text-sm font-bold text-navy-900"><LogOut className="h-4 w-4" aria-hidden="true" />Sign out</button></div>}</header>{signOutError && <p className="mx-auto mt-4 max-w-360 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{signOutError}</p>}<main id="main-content"><Outlet /></main>
  </div>
}

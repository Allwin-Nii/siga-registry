import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../state/useAdminAuth'

const navItem = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-bold transition ${isActive ? 'bg-teal-100 text-teal-800' : 'text-slate-600 hover:bg-slate-100 hover:text-navy-900'}`

export function AdminLayout() {
  const { session, logout } = useAdminAuth()
  const navigate = useNavigate()
  const [signOutError, setSignOutError] = useState('')
  const signOut = async () => {
    try {
      await logout()
      navigate('/admin/login', { replace: true })
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : 'Unable to sign out. Please try again.')
    }
  }

  return <div className="min-h-screen bg-sand-50">
    <header className="border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/admin" className="flex items-center gap-3 text-navy-950"><span className="grid size-10 place-items-center rounded-xl bg-navy-950 text-lg font-black text-white">S</span><span><span className="block text-base font-black tracking-tight">SIGA Registry</span><span className="block text-xs text-slate-500">Administrator workspace</span></span></Link>
        <nav aria-label="Administrator navigation" className="order-3 flex w-full items-center gap-1 overflow-x-auto sm:order-2 sm:w-auto"><NavLink to="/admin" end className={navItem}>Overview</NavLink><NavLink to="/admin/establishments" className={navItem}>Establishments</NavLink><NavLink to="/admin/categories" className={navItem}>Categories</NavLink></nav>
        <div className="order-2 flex items-center gap-3 sm:order-3"><span className="hidden text-sm text-slate-500 sm:block">{session?.administrator.email}</span><button type="button" onClick={() => void signOut()} className="rounded-lg border border-navy-900 px-3.5 py-2 text-sm font-bold text-navy-900 hover:bg-navy-950 hover:text-white">Sign out</button></div>
      </div>
    </header>
    {signOutError && <p className="mx-auto mt-4 max-w-7xl rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{signOutError}</p>}
    <main id="main-content"><Outlet /></main>
  </div>
}

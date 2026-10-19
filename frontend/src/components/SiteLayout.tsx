import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { SimulationNotice } from './SimulationNotice'

const navItem = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-bold transition ${isActive ? 'bg-teal-100 text-teal-700' : 'text-slate-600 hover:bg-slate-100 hover:text-navy-900'}`

export function SiteLayout() {
  const [noticeOpen, setNoticeOpen] = useState(true)

  return (
    <div className="min-h-screen bg-sand-50">
      <a className="sr-only focus:not-sr-only focus:absolute focus:left-5 focus:top-5 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2" href="#main-content">Skip to content</a>
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <NavLink to="/" className="flex items-center gap-3 text-navy-950" aria-label="SIGA Registry home">
            <span className="grid size-10 place-items-center rounded-xl bg-navy-950 text-lg font-black text-white shadow-sm">S</span>
            <span><span className="block text-base font-black tracking-tight">SIGA Registry</span><span className="block text-xs text-slate-500">Establishment reference system</span></span>
          </NavLink>
          <nav aria-label="Primary navigation" className="order-3 flex w-full items-center gap-1 overflow-x-auto pb-1 sm:order-2 sm:w-auto sm:pb-0">
            <NavLink to="/directory" className={navItem}>Directory</NavLink>
            <NavLink to="/staff/dashboard" className={navItem}>Staff workspace</NavLink>
            <NavLink to="/admin/review" className={navItem}>Review queue</NavLink>
          </nav>
          <NavLink to="/sign-in" className="order-2 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-navy-800 sm:order-3">Sign in</NavLink>
        </div>
      </header>
      {noticeOpen && <div className="border-b border-teal-700/15 bg-white"><div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-3 sm:px-6 lg:px-8"><div className="flex-1"><SimulationNotice compact /></div><button onClick={() => setNoticeOpen(false)} className="mt-1 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-navy-900" aria-label="Dismiss prototype notice">×</button></div></div>}
      <main id="main-content"><Outlet /></main>
      <footer className="mt-16 border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><p>© SIGA Registry prototype · fictional data only</p><p>Frontend foundation · no live records or authentication</p></div></footer>
    </div>
  )
}

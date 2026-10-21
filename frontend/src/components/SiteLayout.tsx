import { NavLink, Outlet } from 'react-router-dom'

const navItem = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-bold transition ${isActive ? 'bg-teal-100 text-teal-800' : 'text-slate-600 hover:bg-slate-100 hover:text-navy-900'}`

export function SiteLayout() {
  return (
    <div className="min-h-screen bg-sand-50">
      <a className="sr-only focus:not-sr-only focus:absolute focus:left-5 focus:top-5 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2" href="#main-content">Skip to content</a>
      <header className="border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="border-b border-navy-900 bg-navy-950 text-slate-200">
          <div className="mx-auto flex max-w-7xl items-center px-4 py-2 text-xs sm:px-6 lg:px-8">
            <span className="font-semibold tracking-wide">Establishment information service</span>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <NavLink to="/" className="flex items-center gap-3 text-navy-950" aria-label="SIGA Registry home">
            <span className="grid size-10 place-items-center rounded-xl bg-navy-950 text-lg font-black text-white shadow-sm">S</span>
            <span>
              <span className="block text-base font-black tracking-tight">SIGA Registry</span>
              <span className="block text-xs text-slate-500">Establishment information directory</span>
            </span>
          </NavLink>
          <nav aria-label="Primary navigation" className="order-3 flex w-full items-center gap-1 overflow-x-auto pb-1 sm:order-2 sm:w-auto sm:pb-0">
            <NavLink to="/" end className={navItem}>Home</NavLink>
            <NavLink to="/directory" className={navItem}>Establishments</NavLink>
            <NavLink to="/staff/dashboard" className={navItem}>Staff Dashboard</NavLink>
            <NavLink to="/admin/review" className={navItem}>Admin Review</NavLink>
          </nav>
          <NavLink to="/sign-in" className="order-2 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-navy-800 sm:order-3">Sign In</NavLink>
        </div>
      </header>
      <main id="main-content"><Outlet /></main>
      <footer className="mt-16 border-t border-navy-900 bg-navy-950 text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.25fr_1fr_1fr] lg:px-8">
          <div><p className="text-lg font-black text-white">SIGA Registry</p><p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">SIGA Registry is an independently developed information system referencing publicly available SIGA information. For official records, visit siga.gov.gh.</p></div>
          <div><p className="text-sm font-bold text-white">Navigation</p><div className="mt-3 grid gap-2 text-sm"><NavLink to="/" className="hover:text-white">Home</NavLink><NavLink to="/directory" className="hover:text-white">Establishments</NavLink><NavLink to="/staff/dashboard" className="hover:text-white">Staff Dashboard</NavLink><NavLink to="/admin/review" className="hover:text-white">Admin Review</NavLink></div></div>
          <div><p className="text-sm font-bold text-white">Official reference</p><a className="mt-3 inline-flex text-sm font-semibold text-teal-100 underline decoration-teal-600 underline-offset-4 hover:text-white" href="https://siga.gov.gh/" target="_blank" rel="noopener noreferrer">Visit the official SIGA website <span aria-hidden="true">↗</span></a><p className="mt-4 text-xs leading-5 text-slate-500">Public information may change. Confirm current details with the relevant establishment.</p></div>
        </div>
      </footer>
    </div>
  )
}

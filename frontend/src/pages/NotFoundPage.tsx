import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return <main className="grid min-h-screen place-items-center bg-sand-50 px-4 text-center"><div><p className="text-sm font-black tracking-[0.16em] text-teal-700 uppercase">404</p><h1 className="mt-3 text-4xl font-black tracking-tight text-navy-950">That page is not here.</h1><p className="mt-3 text-slate-600">Return to the SIGA Registry directory.</p><Link to="/" className="mt-7 inline-flex rounded-lg bg-navy-950 px-5 py-3 text-sm font-bold text-white hover:bg-navy-800">Go to home</Link></div></main>
}

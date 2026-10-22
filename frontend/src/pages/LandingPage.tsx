import { type FormEvent, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPublicCategories, getPublicDirectory } from '../api/publicApi'
import { usePublicApiResource } from '../api/usePublicApiResource'
import { EstablishmentCard } from '../components/EstablishmentCard'

export function LandingPage() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const categories = usePublicApiResource(useCallback(
    (signal: AbortSignal) => getPublicCategories({ signal }),
    [],
  ))
  const directory = usePublicApiResource(useCallback(
    (signal: AbortSignal) => getPublicDirectory({ page: 1, pageSize: 3 }, { signal }),
    [],
  ))
  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    const value = query.trim()
    navigate(`/directory${value ? `?search=${encodeURIComponent(value)}` : ''}`)
  }

  return (
    <>
      <section className="overflow-hidden bg-navy-950">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-24">
          <div className="relative z-10">
            <p className="text-sm font-black tracking-[0.18em] text-teal-100 uppercase">Establishment information</p>
            <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">Specified Entities Registry</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">Explore information on State-Owned Enterprises, Joint Venture Companies, and Other State Entities in Ghana.</p>
            <form onSubmit={submitSearch} className="mt-8 max-w-2xl rounded-2xl bg-white p-2 shadow-xl">
              <label className="sr-only" htmlFor="hero-search">Search establishment names</label>
              <input id="hero-search" value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-xl border-0 px-4 py-3.5 text-slate-900 outline-none ring-1 ring-slate-300 placeholder:text-slate-400 focus:ring-3 focus:ring-teal-700" placeholder="Search establishment names" />
            </form>
            <button onClick={() => navigate('/directory')} className="mt-5 inline-flex items-center rounded-lg bg-teal-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-600">Browse Establishments <span className="ml-2" aria-hidden="true">→</span></button>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-navy-800 to-navy-950 p-6 shadow-2xl sm:p-8">
            <div className="absolute -right-10 -top-10 size-32 rounded-full bg-teal-600/20 blur-2xl" />
            <div className="absolute -bottom-16 -left-12 size-40 rounded-full border border-teal-300/15" />
            <p className="relative text-sm font-bold text-teal-100">Registry overview</p>
            <dl className="relative mt-7 space-y-6">
              <div className="border-b border-white/10 pb-6"><dt className="text-3xl font-black text-white">{directory.data ? directory.data.meta.total : directory.error ? '—' : '…'}</dt><dd className="mt-1 text-sm text-slate-300">Published establishment profiles</dd></div>
              <div className="border-b border-white/10 pb-6"><dt className="text-3xl font-black text-white">{categories.data ? categories.data.length : categories.error ? '—' : '…'}</dt><dd className="mt-1 text-sm text-slate-300">Entity categories</dd></div>
              <div><dt className="text-3xl font-black text-white">6</dt><dd className="mt-1 text-sm text-slate-300">Public information fields per profile</dd></div>
            </dl>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div><p className="text-sm font-black tracking-[0.16em] text-teal-700 uppercase">Browse by category</p><h2 className="mt-2 text-3xl font-black tracking-tight text-navy-950">Find establishments by category.</h2></div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {categories.loading && <p className="text-slate-600" role="status">Loading entity categories…</p>}
          {categories.error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5" role="alert"><p className="text-sm text-rose-700">Unable to load categories. {categories.error.message}</p><button type="button" onClick={categories.retry} className="mt-3 text-sm font-bold text-teal-700">Retry categories</button></div>}
          {categories.data?.map((category) => <button key={category.id} onClick={() => navigate(`/directory?category=${encodeURIComponent(category.code)}`)} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-700/35 hover:shadow-md"><span className="grid size-10 place-items-center rounded-lg bg-teal-100 font-black text-teal-800">{category.code}</span><h3 className="mt-5 font-black text-navy-950">{category.description}</h3><span className="mt-5 inline-flex text-sm font-bold text-teal-700">View category <span className="ml-2" aria-hidden="true">→</span></span></button>)}
        </div>
      </section>
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div><p className="text-sm font-black tracking-[0.16em] text-teal-700 uppercase">Featured profiles</p><h2 className="mt-2 text-3xl font-black tracking-tight text-navy-950">Featured establishments</h2><p className="mt-3 max-w-2xl leading-7 text-slate-600">Explore a selection of published establishment profiles from across the registry.</p></div>
          {directory.loading && <p className="mt-8 text-slate-600" role="status">Loading featured establishments…</p>}
          {directory.error && <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-5" role="alert"><p className="text-sm text-rose-700">Unable to load featured establishments. {directory.error.message}</p><button type="button" onClick={directory.retry} className="mt-3 text-sm font-bold text-teal-700">Retry featured establishments</button></div>}
          {directory.data && (directory.data.data.length ? <div className="mt-8 grid gap-5 md:grid-cols-3">{directory.data.data.map((establishment) => <EstablishmentCard key={establishment.id} establishment={establishment} />)}</div> : <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-slate-600">No published establishments are available yet.</p>)}
        </div>
      </section>
    </>
  )
}

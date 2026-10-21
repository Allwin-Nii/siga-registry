import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EstablishmentCard } from '../components/EstablishmentCard'
import { filterPublishedEstablishments } from '../data/directoryFilters'
import { useRegistry } from '../state/useRegistry'

const pageSize = 6

export function DirectoryPage() {
  const [params, setParams] = useSearchParams()
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const { categories, establishments } = useRegistry()
  const query = params.get('query') ?? ''
  const requestedCategory = params.get('category') ?? ''
  const category = categories.some((option) => option.id === requestedCategory) ? requestedCategory : ''
  const results = useMemo(() => filterPublishedEstablishments(establishments, query, category), [category, establishments, query])
  const updateParam = (key: 'query' | 'category', value: string) => {
    setVisibleCount(pageSize)
    setParams((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    })
  }
  const clearFilters = () => { setVisibleCount(pageSize); setParams({}) }

  return <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
    <div className="rounded-3xl bg-navy-950 px-6 py-10 text-white shadow-sm sm:px-10">
      <p className="text-sm font-black tracking-[0.16em] text-teal-100 uppercase">Public directory</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Explore establishments</h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-300">Search published establishment profiles by name or browse State-Owned Enterprises, Joint Venture Companies, and Other State Entities.</p>
    </div>
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="w-full lg:max-w-xl"><label className="text-sm font-bold text-slate-700" htmlFor="directory-search">Search establishments</label><input id="directory-search" value={query} onChange={(event) => updateParam('query', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm shadow-xs focus:border-teal-700" placeholder="Search by establishment name" /></div>
        <div className="flex items-center gap-3"><p aria-label={`${results.length} ${results.length === 1 ? 'establishment' : 'establishments'} found`} className="text-sm text-slate-500"><span className="font-bold text-navy-950">{results.length}</span> {results.length === 1 ? 'establishment' : 'establishments'} found</p>{(query || category) && <button onClick={clearFilters} className="text-sm font-bold text-teal-700 hover:text-teal-600">Clear filters</button>}</div>
      </div>
      <fieldset className="mt-6"><legend className="text-sm font-bold text-slate-700">Entity category</legend><div className="mt-3 flex flex-wrap gap-2">
        <button type="button" aria-pressed={!category} onClick={() => updateParam('category', '')} className={`rounded-full px-4 py-2 text-sm font-bold transition ${!category ? 'bg-navy-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>All entities</button>
        {categories.map((option) => <button type="button" key={option.id} aria-pressed={category === option.id} onClick={() => updateParam('category', option.id)} className={`rounded-full px-4 py-2 text-sm font-bold transition ${category === option.id ? 'bg-teal-700 text-white' : 'bg-teal-100/70 text-teal-800 hover:bg-teal-100'}`}>{option.name} <span className="font-normal">— {option.description}</span></button>)}
      </div></fieldset>
    </section>
    <section aria-live="polite" className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-black tracking-[0.16em] text-teal-700 uppercase">Directory results</p><h2 className="mt-1 text-2xl font-black tracking-tight text-navy-950">Published establishment profiles</h2></div>{(query || category) && <p className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">Filtered view</p>}</div>
      {results.length ? <><div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{results.slice(0, visibleCount).map((item) => <EstablishmentCard key={item.id} establishment={item} />)}</div>{visibleCount < results.length && <div className="mt-8 text-center"><button onClick={() => setVisibleCount((count) => count + pageSize)} className="rounded-lg border border-navy-900 px-5 py-3 text-sm font-bold text-navy-900 hover:bg-navy-950 hover:text-white">Load more establishments</button></div>}</> : <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h3 className="font-black text-navy-950">No establishments match those filters</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Try a different name or clear your filters to return to the full directory.</p><button onClick={clearFilters} className="mt-5 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-800">Reset directory</button></div>}
    </section>
  </div>
}

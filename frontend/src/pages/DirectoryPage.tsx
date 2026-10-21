import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EstablishmentCard } from '../components/EstablishmentCard'
import { SectionHeading } from '../components/SectionHeading'
import { filterPublishedEstablishments } from '../data/directoryFilters'
import { useRegistry } from '../state/useRegistry'

const pageSize = 3

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
    <SectionHeading eyebrow="Public directory" title="Explore establishments" description="This prototype directory contains fictional records only. It lists published records from the shared in-memory registry." />
    <div className="mt-10 grid gap-8 lg:grid-cols-[17rem_1fr]">
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-black text-navy-950">Refine results</h2>
        <div className="mt-5"><label className="text-sm font-bold text-slate-700" htmlFor="directory-search">Establishment name</label><input id="directory-search" value={query} onChange={(event) => updateParam('query', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-teal-700" placeholder="Search by name" /></div>
        <fieldset className="mt-6"><legend className="text-sm font-bold text-slate-700">Category</legend><div className="mt-3 grid gap-2">
          <button type="button" aria-pressed={!category} onClick={() => updateParam('category', '')} className={`rounded-lg px-3 py-2 text-left text-sm font-bold ${!category ? 'bg-teal-100 text-teal-700' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}>All</button>
          {categories.map((option) => <button type="button" key={option.id} aria-pressed={category === option.id} onClick={() => updateParam('category', option.id)} className={`rounded-lg px-3 py-2 text-left text-sm font-bold ${category === option.id ? 'bg-teal-100 text-teal-700' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}>{option.name}s <span className="font-normal">— {option.description}</span></button>)}
        </div></fieldset>
        <button onClick={clearFilters} className="mt-6 text-sm font-bold text-teal-700 hover:text-teal-600">Clear filters</button>
      </aside>
      <section aria-live="polite"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black text-navy-950">Directory results</h2><p className="mt-1 text-sm text-slate-500">{results.length} {results.length === 1 ? 'establishment' : 'establishments'} found</p></div>{(query || category) && <p className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">Filtered view</p>}</div>
        {results.length ? <><div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{results.slice(0, visibleCount).map((item) => <EstablishmentCard key={item.id} establishment={item} />)}</div>{visibleCount < results.length && <div className="mt-8 text-center"><button onClick={() => setVisibleCount((count) => count + pageSize)} className="rounded-lg border border-navy-900 px-5 py-3 text-sm font-bold text-navy-900 hover:bg-navy-950 hover:text-white">Load more establishments</button></div>}</> : <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h3 className="font-black text-navy-950">No establishments match those filters</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Try a different name or clear your filters. This prototype does not query a live registry.</p><button onClick={clearFilters} className="mt-5 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-800">Reset directory</button></div>}
      </section>
    </div>
  </div>
}

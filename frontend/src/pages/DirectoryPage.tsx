import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EstablishmentCard } from '../components/EstablishmentCard'
import { SectionHeading } from '../components/SectionHeading'
import { categoryOptions, establishments } from '../data/mockData'

const pageSize = 3

export function DirectoryPage() {
  const [params, setParams] = useSearchParams()
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const query = params.get('query') ?? ''
  const category = params.get('category') ?? ''
  const results = useMemo(() => establishments.filter((item) => {
    const text = `${item.name} ${item.location} ${item.summary}`.toLowerCase()
    return text.includes(query.toLowerCase()) && (!category || item.categoryId === category)
  }), [category, query])
  const updateParam = (key: string, value: string) => { setVisibleCount(pageSize); setParams((current) => { const next = new URLSearchParams(current); if (value) next.set(key, value); else next.delete(key); return next }) }
  const clearFilters = () => { setVisibleCount(pageSize); setParams({}) }

  return <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><SectionHeading eyebrow="Public directory" title="Explore sample establishments" description="This prototype directory contains fictional records only. Categories are configurable placeholders, ready to be supplied by a future backend." /><div className="mt-10 grid gap-8 lg:grid-cols-[17rem_1fr]"><aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black text-navy-950">Refine results</h2><div className="mt-5"><label className="text-sm font-bold text-slate-700" htmlFor="directory-search">Keyword</label><input id="directory-search" value={query} onChange={(event) => updateParam('query', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-teal-700" placeholder="Name or place" /></div><fieldset className="mt-6"><legend className="text-sm font-bold text-slate-700">Sample category</legend><div className="mt-3 space-y-2">{categoryOptions.map((option) => <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-700" key={option.id}><input type="radio" name="category" checked={category === option.id} onChange={() => updateParam('category', option.id)} className="size-4 accent-teal-700" />{option.name}</label>)}<label className="flex cursor-pointer items-center gap-3 text-sm text-slate-700"><input type="radio" name="category" checked={!category} onChange={() => updateParam('category', '')} className="size-4 accent-teal-700" />All sample categories</label></div></fieldset><button onClick={clearFilters} className="mt-6 text-sm font-bold text-teal-700 hover:text-teal-600">Clear filters</button></aside><section aria-live="polite"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black text-navy-950">Directory results</h2><p className="mt-1 text-sm text-slate-500">{results.length} fictional sample {results.length === 1 ? 'record' : 'records'} found</p></div>{(query || category) && <p className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">Filtered view</p>}</div>{results.length ? <><div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{results.slice(0, visibleCount).map((item) => <EstablishmentCard key={item.id} establishment={item} />)}</div>{visibleCount < results.length && <div className="mt-8 text-center"><button onClick={() => setVisibleCount((count) => count + pageSize)} className="rounded-lg border border-navy-900 px-5 py-3 text-sm font-bold text-navy-900 hover:bg-navy-950 hover:text-white">Load more sample records</button></div>}</> : <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h3 className="font-black text-navy-950">No sample records match those filters</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Try a different keyword or clear your filters. This prototype does not query a live registry.</p><button onClick={clearFilters} className="mt-5 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-800">Reset directory</button></div>}</section></div></div>
}

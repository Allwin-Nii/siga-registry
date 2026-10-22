import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getPublicCategories, getPublicDirectory } from '../api/publicApi'
import { usePublicApiResource } from '../api/usePublicApiResource'
import { EstablishmentCard } from '../components/EstablishmentCard'

const pageSize = 6
const isCategoryCode = (value: string) => /^[A-Z]{3}$/.test(value)
const toPageNumber = (value: string | null) => {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1
}

export function DirectoryPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('search') ?? params.get('query') ?? ''
  const requestedCategory = (params.get('category') ?? '').trim().toUpperCase()
  const category = isCategoryCode(requestedCategory) ? requestedCategory : ''
  const page = toPageNumber(params.get('page'))
  const categories = usePublicApiResource(useCallback(
    (signal: AbortSignal) => getPublicCategories({ signal }),
    [],
  ))
  const directory = usePublicApiResource(useCallback(
    (signal: AbortSignal) => getPublicDirectory({ search: query, category, page, pageSize }, { signal }),
    [category, page, query],
  ))
  const updateParam = (key: 'search' | 'category', value: string) => {
    setParams((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set(key, value)
      else next.delete(key)
      next.delete('page')
      return next
    })
  }
  const clearFilters = () => setParams({})
  const changePage = (nextPage: number) => setParams((current) => {
    const next = new URLSearchParams(current)
    if (nextPage <= 1) next.delete('page')
    else next.set('page', String(nextPage))
    return next
  })
  const resultCount = directory.data?.meta.total

  return <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
    <div className="rounded-3xl bg-navy-950 px-6 py-10 text-white shadow-sm sm:px-10">
      <p className="text-sm font-black tracking-[0.16em] text-teal-100 uppercase">Public directory</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Explore Specified Entities</h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-300">Search published entity profiles by name or browse State-Owned Enterprises, Joint Venture Companies, and Other State Entities.</p>
    </div>
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="w-full lg:max-w-xl"><label className="text-sm font-bold text-slate-700" htmlFor="directory-search">Search entities</label><input id="directory-search" value={query} onChange={(event) => updateParam('search', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm shadow-xs focus:border-teal-700" placeholder="Search by entity name" /></div>
        <div className="flex items-center gap-3"><p aria-label={resultCount === undefined ? 'Loading entity count' : `${resultCount} ${resultCount === 1 ? 'entity' : 'entities'} found`} className="text-sm text-slate-500">{resultCount === undefined ? 'Loading results…' : <><span className="font-bold text-navy-950">{resultCount}</span> {resultCount === 1 ? 'entity' : 'entities'} found</>}</p>{(query || category) && <button onClick={clearFilters} className="text-sm font-bold text-teal-700 hover:text-teal-600">Clear filters</button>}</div>
      </div>
      <fieldset className="mt-6"><legend className="text-sm font-bold text-slate-700">Entity category</legend><div className="mt-3 flex flex-wrap gap-2">
        <button type="button" aria-pressed={!category} onClick={() => updateParam('category', '')} className={`rounded-full px-4 py-2 text-sm font-bold transition ${!category ? 'bg-navy-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>All entities</button>
        {categories.data?.map((option) => <button type="button" key={option.id} aria-pressed={category === option.code} onClick={() => updateParam('category', option.code)} className={`rounded-full px-4 py-2 text-sm font-bold transition ${category === option.code ? 'bg-teal-700 text-white' : 'bg-teal-100/70 text-teal-800 hover:bg-teal-100'}`}>{option.code} <span className="font-normal">— {option.description}</span></button>)}
      </div></fieldset>
      {categories.loading && <p className="mt-4 text-sm text-slate-500" role="status">Loading entity categories…</p>}
      {categories.error && <div className="mt-4 flex flex-wrap items-center gap-3 text-sm" role="alert"><p className="text-rose-700">Unable to load category filters. {categories.error.message}</p><button type="button" onClick={categories.retry} className="font-bold text-teal-700 hover:text-teal-600">Retry categories</button></div>}
    </section>
    <section aria-live="polite" className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-black tracking-[0.16em] text-teal-700 uppercase">Directory results</p><h2 className="mt-1 text-2xl font-black tracking-tight text-navy-950">Published entity profiles</h2></div>{(query || category) && <p className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">Filtered view</p>}</div>
      {directory.loading && <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-10 text-center" role="status"><h3 className="font-black text-navy-950">Loading published entities…</h3><p className="mt-2 text-sm text-slate-600">Retrieving the latest public directory.</p></div>}
      {directory.error && <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center" role="alert"><h3 className="font-black text-navy-950">The directory is unavailable right now</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-700">{directory.error.message}</p><button type="button" onClick={directory.retry} className="mt-5 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-800">Retry directory</button></div>}
      {directory.data && (directory.data.data.length ? <><div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{directory.data.data.map((item) => <EstablishmentCard key={item.id} establishment={item} />)}</div>{directory.data.meta.totalPages > 1 && <nav aria-label="Directory pagination" className="mt-8 flex items-center justify-center gap-4"><button type="button" disabled={directory.data.meta.page <= 1} onClick={() => changePage(directory.data!.meta.page - 1)} className="rounded-lg border border-navy-900 px-4 py-2.5 text-sm font-bold text-navy-900 disabled:cursor-not-allowed disabled:opacity-45 hover:bg-navy-950 hover:text-white">Previous</button><p className="text-sm text-slate-600">Page {directory.data.meta.page} of {directory.data.meta.totalPages}</p><button type="button" disabled={directory.data.meta.page >= directory.data.meta.totalPages} onClick={() => changePage(directory.data!.meta.page + 1)} className="rounded-lg border border-navy-900 px-4 py-2.5 text-sm font-bold text-navy-900 disabled:cursor-not-allowed disabled:opacity-45 hover:bg-navy-950 hover:text-white">Next</button></nav>}</> : <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h3 className="font-black text-navy-950">{query || category ? 'No entities match those filters' : 'No published entities are available yet'}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{query || category ? 'Try a different name or clear your filters to return to the full directory.' : 'Published profiles will appear here when they are available.'}</p>{(query || category) && <button onClick={clearFilters} className="mt-5 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-800">Reset directory</button>}</div>)}
    </section>
  </div>
}

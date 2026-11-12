import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  getPublicCategories,
  getPublicDirectory,
  getPublicEntityOptions,
  type DirectoryMeta,
  type PublicEstablishment,
} from '../api/publicApi'
import { usePublicApiResource } from '../api/usePublicApiResource'
import { EstablishmentCard } from '../components/EstablishmentCard'

const CARDS_PER_PAGE = 16
const ENTITY_OPTIONS_PAGE_SIZE = 25
const isCategoryCode = (value: string) => /^[A-Z]{3}$/.test(value)

type DirectoryFilters = {
  search: string
  category: string
  entity: string
  sort: 'asc' | 'desc'
}

type ProgressiveDirectoryState = {
  key: string
  data: PublicEstablishment[]
  meta?: DirectoryMeta
  nextPage: number
  loadingInitial: boolean
  loadingMore: boolean
  error?: Error
  moreError?: Error
}

const directoryKey = ({ search, category, entity, sort }: DirectoryFilters) => [search, category, entity, sort].join('\u0000')
const emptyEntityOptions = { data: [], meta: { page: 1, pageSize: ENTITY_OPTIONS_PAGE_SIZE, total: 0, totalPages: 0 } }

function useProgressiveDirectory(filters: DirectoryFilters) {
  const key = directoryKey(filters)
  const [retryVersion, setRetryVersion] = useState(0)
  const [state, setState] = useState<ProgressiveDirectoryState>({
    key: '', data: [], nextPage: 1, loadingInitial: true, loadingMore: false,
  })

  useEffect(() => {
    const controller = new AbortController()

    void getPublicDirectory({ ...filters, page: 1, pageSize: CARDS_PER_PAGE }, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) {
          setState({ key, data: result.data, meta: result.meta, nextPage: 2, loadingInitial: false, loadingMore: false })
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            key,
            data: [],
            nextPage: 1,
            loadingInitial: false,
            loadingMore: false,
            error: error instanceof Error ? error : new Error('Unable to load the directory.'),
          })
        }
      })

    return () => controller.abort()
  }, [filters, key, retryVersion])

  const loadMore = useCallback(() => {
    if (state.key !== key || !state.meta || state.loadingInitial || state.loadingMore || state.data.length >= state.meta.total) return

    const page = state.nextPage
    setState((current) => current.key !== key ? current : { ...current, loadingMore: true, moreError: undefined })
    void getPublicDirectory({ ...filters, page, pageSize: CARDS_PER_PAGE })
      .then((result) => {
        setState((current) => {
          if (current.key !== key) return current
          const seen = new Set(current.data.map((entity) => entity.id))
          return {
            ...current,
            data: [...current.data, ...result.data.filter((entity) => !seen.has(entity.id))],
            meta: result.meta,
            nextPage: page + 1,
            loadingMore: false,
          }
        })
      })
      .catch((error: unknown) => {
        setState((current) => current.key !== key ? current : {
          ...current,
          loadingMore: false,
          moreError: error instanceof Error ? error : new Error('Unable to load more entities.'),
        })
      })
  }, [filters, key, state])

  return {
    data: state.key === key ? state.data : [],
    meta: state.key === key ? state.meta : undefined,
    loading: state.key !== key || state.loadingInitial,
    loadingMore: state.key === key && state.loadingMore,
    error: state.key === key ? state.error : undefined,
    moreError: state.key === key ? state.moreError : undefined,
    loadMore,
    retry: () => setRetryVersion((version) => version + 1),
  }
}

function EntityPicker({ category, value, onChange }: {
  category: string
  value: string
  onChange: (slug: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const selected = usePublicApiResource(useCallback(
    (signal: AbortSignal) => value
      ? getPublicEntityOptions({ entity: value, page: 1, pageSize: 1 }, { signal })
      : Promise.resolve(emptyEntityOptions),
    [value],
  ))
  const options = usePublicApiResource(useCallback(
    (signal: AbortSignal) => open
      ? getPublicEntityOptions({ category, search, page, pageSize: ENTITY_OPTIONS_PAGE_SIZE }, { signal })
      : Promise.resolve(emptyEntityOptions),
    [category, open, page, search],
  ))

  useEffect(() => {
    const selectedOption = selected.data?.data[0]
    if (value && category && selectedOption && selectedOption.categoryCode !== category) onChange('')
  }, [category, onChange, selected.data, value])

  const selectedName = selected.data?.data[0]?.name
  const hasMoreOptions = Boolean(options.data && page < options.data.meta.totalPages)
  const hasPreviousOptions = page > 1
  const visibleOptions = options.data?.data ?? []
  const togglePicker = () => {
    const nextOpen = !open
    if (nextOpen) setPage(1)
    setOpen(nextOpen)
  }

  return <div className="relative w-full">
    <label className="block text-sm font-bold text-slate-700" htmlFor="directory-entity">Entities</label>
    <button id="directory-entity" data-filter-control="entities" type="button" aria-haspopup="listbox" aria-expanded={open} onClick={togglePicker} className="mt-2 flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-sm text-slate-900 shadow-xs focus:border-teal-700">
      <span className="truncate">{value ? selectedName ?? 'Selected entity' : 'All entities'}</span><span aria-hidden="true" className="ml-3 text-slate-500">▾</span>
    </button>
    {open && <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
      <label className="sr-only" htmlFor="directory-entity-search">Filter entity options</label>
      <input id="directory-entity-search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-700" placeholder="Filter entity names" />
      {options.error && <p className="mt-3 text-sm text-rose-700" role="alert">Unable to load entities. {options.error.message}</p>}
      {options.loading && <p className="mt-3 text-sm text-slate-500" role="status">Loading entities…</p>}
      {!options.loading && !options.error && <ul role="listbox" aria-label="Entity options" className="mt-3 max-h-64 space-y-1 overflow-auto">
        <li role="option" aria-selected={!value}><button type="button" onClick={() => { onChange(''); setOpen(false) }} className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-teal-50">All entities</button></li>
        {visibleOptions.map((option) => <li key={option.id} role="option" aria-selected={value === option.slug}><button type="button" onClick={() => { onChange(option.slug); setOpen(false) }} className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-800 hover:bg-teal-50"><span className="block truncate">{option.name}</span><span className="text-xs font-semibold text-slate-500">{option.categoryCode}</span></button></li>)}
        {!visibleOptions.length && <li className="px-3 py-2 text-sm text-slate-500">No published entities match this category.</li>}
      </ul>}
      {(hasPreviousOptions || hasMoreOptions) && <div className="mt-3 flex gap-2"><button type="button" disabled={!hasPreviousOptions} onClick={() => setPage((current) => current - 1)} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-45">Previous options</button>{hasMoreOptions && <button type="button" onClick={() => setPage((current) => current + 1)} className="flex-1 rounded-lg border border-teal-700 px-3 py-2 text-sm font-bold text-teal-700 hover:bg-teal-50">Next options</button>}</div>}
    </div>}
  </div>
}

export function DirectoryPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('search') ?? params.get('query') ?? ''
  const requestedCategory = (params.get('category') ?? '').trim().toUpperCase()
  const category = isCategoryCode(requestedCategory) ? requestedCategory : ''
  const entity = (params.get('entity') ?? '').trim().toLowerCase()
  const sort: 'asc' | 'desc' = params.get('sort') === 'desc' ? 'desc' : 'asc'
  const filters = useMemo(() => ({ search: query, category, entity, sort }), [category, entity, query, sort])
  const categories = usePublicApiResource(useCallback(
    (signal: AbortSignal) => getPublicCategories({ signal }),
    [],
  ))
  const directory = useProgressiveDirectory(filters)
  const activeFilters = Boolean(query || category || entity || sort !== 'asc')
  const updateFilter = (key: 'search' | 'category' | 'entity' | 'sort', value: string) => {
    setParams((current) => {
      const next = new URLSearchParams(current)
      if (value && !(key === 'sort' && value === 'asc')) next.set(key, value)
      else next.delete(key)
      next.delete('query')
      return next
    })
  }
  const clearFilters = () => setParams({})
  const total = directory.meta?.total
  const canLoadMore = Boolean(total !== undefined && directory.data.length < total)

  return <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div data-testid="directory-toolbar" role="group" aria-label="Directory filters" className="flex flex-col gap-3 lg:flex-row lg:flex-nowrap lg:items-end">
        <div className="w-full lg:min-w-0 lg:flex-1"><label className="block text-sm font-bold text-slate-700" htmlFor="directory-search">Search entities</label><input data-filter-control="search" id="directory-search" value={query} onChange={(event) => updateFilter('search', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm shadow-xs focus:border-teal-700" placeholder="Search by entity name" /></div>
        <div className="w-full lg:w-40"><label className="block text-sm font-bold text-slate-700" htmlFor="directory-category">Categories</label><select data-filter-control="categories" id="directory-category" value={category} onChange={(event) => updateFilter('category', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 shadow-xs focus:border-teal-700"><option value="">All categories</option>{categories.data?.map((option) => <option key={option.id} value={option.code}>{option.code}</option>)}</select></div>
        <div className="w-full lg:w-64"><EntityPicker key={category} category={category} value={entity} onChange={(slug) => updateFilter('entity', slug)} /></div>
        <div className="w-full lg:w-36"><label className="block text-sm font-bold text-slate-700" htmlFor="directory-sort">Sort</label><select data-filter-control="sort" id="directory-sort" value={sort} onChange={(event) => updateFilter('sort', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 shadow-xs focus:border-teal-700"><option value="asc">A to Z</option><option value="desc">Z to A</option></select></div>
        <button data-filter-control="clear" type="button" onClick={clearFilters} className="w-full rounded-xl border border-navy-950 px-4 py-3 text-sm font-bold text-navy-950 transition hover:bg-navy-950 hover:text-white lg:w-auto lg:shrink-0">Clear Filters</button>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p aria-label={total === undefined ? 'Loading entity count' : `${total} ${total === 1 ? 'entity' : 'entities'} found`} className="text-sm text-slate-500">{total === undefined ? 'Loading results…' : <><span className="font-bold text-navy-950">{total}</span> {total === 1 ? 'entity' : 'entities'} found</>}</p>{categories.loading && <p className="text-sm text-slate-500" role="status">Loading entity categories…</p>}{categories.error && <div className="flex items-center gap-3 text-sm" role="alert"><p className="text-rose-700">Unable to load category filters. {categories.error.message}</p><button type="button" onClick={categories.retry} className="font-bold text-teal-700 hover:text-teal-600">Retry categories</button></div>}</div>
    </section>
    <section aria-live="polite" className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-black tracking-[0.16em] text-teal-700 uppercase">Directory results</p><h2 className="mt-1 text-2xl font-black tracking-tight text-navy-950">Published entity profiles</h2></div>{activeFilters && <p className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">Filtered view</p>}</div>
      {directory.loading && <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-10 text-center" role="status"><h3 className="font-black text-navy-950">Loading published entities…</h3><p className="mt-2 text-sm text-slate-600">Retrieving the latest public directory.</p></div>}
      {directory.error && <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center" role="alert"><h3 className="font-black text-navy-950">The directory is unavailable right now</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-700">{directory.error.message}</p><button type="button" onClick={directory.retry} className="mt-5 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-800">Retry directory</button></div>}
      {!directory.loading && !directory.error && (directory.data.length ? <><div data-testid="directory-card-grid" className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{directory.data.map((item) => <EstablishmentCard key={item.id} establishment={item} />)}</div>{directory.moreError && <div className="mt-5 text-center" role="alert"><p className="text-sm text-rose-700">Unable to load more entities. {directory.moreError.message}</p><button type="button" onClick={directory.loadMore} className="mt-2 text-sm font-bold text-teal-700 hover:text-teal-600">Try again</button></div>}{canLoadMore && <div className="mt-8 text-center"><button type="button" onClick={directory.loadMore} disabled={directory.loadingMore} className="rounded-lg bg-navy-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-55">{directory.loadingMore ? 'Loading more entities…' : 'View More'}</button></div>}</> : <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h3 className="font-black text-navy-950">{activeFilters ? 'No entities match those filters' : 'No published entities are available yet'}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{activeFilters ? 'Try a different filter or clear your filters to return to the full directory.' : 'Published profiles will appear here when they are available.'}</p>{activeFilters && <button type="button" onClick={clearFilters} className="mt-5 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-800">Reset directory</button>}</div>)}
    </section>
  </div>
}

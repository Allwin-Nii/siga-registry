import { type FormEvent, useCallback, useMemo, useState } from 'react'
import { ArrowRight, Building2, Factory, Handshake, Landmark, Search } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { getPublicDashboard, type PublicDashboard, type PublicDashboardTimestampSource } from '../api/publicApi'
import { usePublicApiResource } from '../api/usePublicApiResource'

type CategoryCode = keyof PublicDashboard['categoryCounts']

type CategoryVisual = {
  code: CategoryCode
  label: string
  description: string
  color: string
  stroke: string
}

const categoryVisuals: CategoryVisual[] = [
  { code: 'SOE', label: 'State-Owned Enterprises', description: 'SOE', color: 'bg-teal-700', stroke: '#0d766e' },
  { code: 'JVC', label: 'Joint Venture Companies', description: 'JVC', color: 'bg-emerald-600', stroke: '#059669' },
  { code: 'OSE', label: 'Other State Entities', description: 'OSE', color: 'bg-sky-700', stroke: '#0369a1' },
]

const numberFormatter = new Intl.NumberFormat('en-GB')

const percent = (count: number, total: number) => total === 0 ? 0 : Math.round((count / total) * 100)

const formatDate = (value: string) => {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed)
}

const timestampLabel = (source: PublicDashboardTimestampSource) => {
  if (source === 'reviewedAt') return 'Published'
  if (source === 'updatedAt') return 'Last updated'
  return 'Created'
}

function CategoryDonut({ dashboard }: { dashboard: PublicDashboard }) {
  const [selectedCode, setSelectedCode] = useState<CategoryCode>('SOE')
  const selected = categoryVisuals.find((item) => item.code === selectedCode) ?? categoryVisuals[0]
  const circumference = 2 * Math.PI * 45
  const segments = categoryVisuals.map((item, index) => {
    const count = dashboard.categoryCounts[item.code]
    const length = dashboard.total === 0 ? 0 : (count / dashboard.total) * circumference
    const offset = categoryVisuals.slice(0, index).reduce((sum, previous) =>
      sum + (dashboard.total === 0 ? 0 : (dashboard.categoryCounts[previous.code] / dashboard.total) * circumference), 0)
    return { ...item, count, length, offset, percentage: percent(count, dashboard.total) }
  })

  return <figure aria-labelledby="category-chart-heading" aria-describedby="category-chart-description" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs font-black tracking-[0.16em] text-teal-700 uppercase">Registry distribution</p><h2 id="category-chart-heading" className="mt-1 text-xl font-black tracking-tight text-navy-950">Entities by Category</h2></div>
      <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-800">Published only</span>
    </div>
    <div className="mt-5 grid items-center gap-6 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="relative mx-auto w-full max-w-56">
        <svg viewBox="0 0 120 120" role="img" aria-labelledby="category-chart-title category-chart-description" className="h-auto w-full overflow-visible">
          <title id="category-chart-title">Published entities by category</title>
          <desc id="category-chart-description">{segments.map((item) => `${item.description}: ${item.count} entities, ${item.percentage} percent`).join('. ') || 'No published entities are available.'}</desc>
          <circle cx="60" cy="60" r="45" fill="none" stroke="#e2e8f0" strokeWidth="16" />
          {segments.map((item) => item.length > 0 && <circle
            key={item.code}
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke={item.stroke}
            strokeWidth="16"
            strokeDasharray={`${item.length} ${circumference - item.length}`}
            strokeDashoffset={-item.offset}
            transform="rotate(-90 60 60)"
            strokeLinecap="butt"
            tabIndex={0}
            role="button"
            aria-label={`${item.label}: ${item.count} published entities, ${item.percentage} percent`}
            onFocus={() => setSelectedCode(item.code)}
            onMouseEnter={() => setSelectedCode(item.code)}
            onClick={() => setSelectedCode(item.code)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setSelectedCode(item.code)
              }
            }}
          ><title>{`${item.label}: ${item.count} (${item.percentage}%)`}</title></circle>)}
          <text x="60" y="56" textAnchor="middle" className="fill-navy-950 text-[23px] font-black">{numberFormatter.format(dashboard.total)}</text>
          <text x="60" y="71" textAnchor="middle" className="fill-slate-500 text-[8px] font-bold">PUBLISHED</text>
        </svg>
      </div>
      <div className="space-y-2" aria-label="Category legend">
        {segments.map((item) => <button key={item.code} type="button" onClick={() => setSelectedCode(item.code)} aria-pressed={selectedCode === item.code} className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition ${selectedCode === item.code ? 'border-teal-700 bg-teal-50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'}`}>
          <span className="flex min-w-0 items-center gap-3"><span className={`size-3 shrink-0 rounded-full ${item.color}`} aria-hidden="true" /><span className="min-w-0"><span className="block truncate text-sm font-bold text-navy-950">{item.label}</span><span className="block text-xs text-slate-500">{item.description}</span></span></span><span className="shrink-0 text-right"><span className="block text-sm font-black text-navy-950">{numberFormatter.format(item.count)}</span><span className="block text-xs text-slate-500">{item.percentage}%</span></span>
        </button>)}
      </div>
    </div>
    <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600" aria-live="polite"><span className="font-bold text-navy-950">{selected?.label}:</span> {numberFormatter.format(dashboard.categoryCounts[selected?.code ?? 'SOE'])} published entities ({percent(dashboard.categoryCounts[selected?.code ?? 'SOE'], dashboard.total)}%).</p>
  </figure>
}

function DashboardContent({ dashboard }: { dashboard: PublicDashboard }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const cards = useMemo(() => [
    { label: 'Total Entities', value: dashboard.total, icon: Building2, className: 'bg-navy-950 text-white', iconClassName: 'bg-white/15 text-white' },
    { label: 'State-Owned Enterprises', value: dashboard.categoryCounts.SOE, icon: Factory, className: 'border-teal-200 bg-white text-navy-950', iconClassName: 'bg-teal-100 text-teal-800' },
    { label: 'Joint Venture Companies', value: dashboard.categoryCounts.JVC, icon: Handshake, className: 'border-emerald-200 bg-white text-navy-950', iconClassName: 'bg-emerald-100 text-emerald-800' },
    { label: 'Other State Entities', value: dashboard.categoryCounts.OSE, icon: Landmark, className: 'border-sky-200 bg-white text-navy-950', iconClassName: 'bg-sky-100 text-sky-800' },
  ], [dashboard])
  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    const search = query.trim()
    navigate(`/directory${search ? `?search=${encodeURIComponent(search)}` : ''}`)
  }

  return <>
    <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, className, iconClassName }) => <article key={label} className={`rounded-2xl border p-5 shadow-sm ${className}`}>
          <div className="flex items-start justify-between gap-3"><p className="max-w-44 text-sm font-bold leading-5">{label}</p><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${iconClassName}`}><Icon size={21} aria-hidden="true" /></span></div><p className="mt-5 text-3xl font-black tracking-tight">{numberFormatter.format(value)}</p><p className="mt-1 text-xs font-semibold opacity-70">Published records</p>
        </article>)}
      </div>
    </section>
    <section className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
      <CategoryDonut dashboard={dashboard} />
      <section aria-labelledby="recent-entities-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black tracking-[0.16em] text-teal-700 uppercase">Latest additions</p><h2 id="recent-entities-heading" className="mt-1 text-xl font-black tracking-tight text-navy-950">Recent Entities</h2></div><Link to="/directory" className="inline-flex items-center gap-1 text-sm font-bold text-teal-700 hover:text-teal-600">Browse all <ArrowRight size={16} aria-hidden="true" /></Link></div>
        {dashboard.recent.length ? <ol className="mt-5 divide-y divide-slate-100">{dashboard.recent.map((entity) => <li key={entity.id} className="py-4 first:pt-0 last:pb-0"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><Link to={`/establishments/${encodeURIComponent(entity.slug)}`} className="font-bold text-navy-950 underline decoration-teal-700/35 underline-offset-4 hover:text-teal-700">{entity.name}</Link><p className="mt-1 text-xs text-slate-500">{timestampLabel(entity.publishedAtSource)} {formatDate(entity.publishedAt)}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">{entity.category.code}</span></div></li>)}</ol> : <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"><p className="font-bold text-navy-950">No published entities yet</p><p className="mt-1 text-sm text-slate-600">Recent published entities will appear here.</p></div>}
      </section>
    </section>
    <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-6"><div><p className="text-xs font-black tracking-[0.16em] text-teal-800 uppercase">Find an entity</p><h2 className="mt-1 text-xl font-black tracking-tight text-navy-950">Search the public register</h2><p className="mt-1 text-sm leading-6 text-slate-600">Search by entity name or browse all published profiles.</p></div><form onSubmit={submitSearch} className="mt-4 flex w-full flex-col gap-2 sm:mt-0 sm:max-w-xl sm:flex-row"><label className="sr-only" htmlFor="dashboard-entity-search">Search entities</label><input id="dashboard-entity-search" value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 grow rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-xs focus:border-teal-700" placeholder="Search by entity name" /><button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-600"><Search size={17} aria-hidden="true" />Search Entities</button><Link to="/directory" className="inline-flex items-center justify-center rounded-xl border border-navy-950 px-4 py-2.5 text-sm font-bold text-navy-950 hover:bg-navy-950 hover:text-white">Browse All Entities</Link></form></div>
    </section>
  </>
}

export function PublicDashboardPage() {
  const dashboard = usePublicApiResource(useCallback(
    (signal: AbortSignal) => getPublicDashboard({ signal }),
    [],
  ))

  return <>
    <section data-testid="dashboard-hero" className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl bg-navy-950 text-white shadow-sm">
        <div aria-hidden="true" className="absolute inset-0 bg-linear-to-r from-navy-950 via-navy-950/95 to-transparent" />
        <div className="relative px-6 py-10 sm:px-10 sm:py-12">
          <div data-testid="dashboard-hero-copy" className="max-w-3xl border-l-2 border-teal-600 pl-5 sm:pl-6">
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Specified Entities Registry</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">A public register of SIGA&apos;s State-Owned Enterprises (SOE), Joint Venture Companies (JVC) and Other State Entities (OSE).</p>
          </div>
        </div>
      </div>
    </section>
    {dashboard.loading && <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8" role="status"><div className="rounded-2xl border border-slate-200 bg-white p-8 text-center"><p className="font-bold text-navy-950">Loading the public dashboard…</p><p className="mt-2 text-sm text-slate-600">Retrieving published registry information.</p></div></section>}
    {dashboard.error && <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center" role="alert"><h2 className="font-black text-navy-950">The public dashboard is unavailable right now</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-700">{dashboard.error.message}</p><button type="button" onClick={dashboard.retry} className="mt-5 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-800">Retry dashboard</button></div></section>}
    {dashboard.data && <DashboardContent dashboard={dashboard.data} />}
  </>
}

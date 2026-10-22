import { useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AdministratorApiError, listAdministratorCategories, listAdministratorEstablishments } from '../api/adminApi'
import { usePublicApiResource } from '../api/usePublicApiResource'
import { useAdminAuth } from '../state/useAdminAuth'

type DashboardData = {
  total: number
  published: number
  categories: number
}

export function AdminDashboardPage() {
  const { clearExpiredSession } = useAdminAuth()
  const dashboard = usePublicApiResource(useCallback(async (signal: AbortSignal): Promise<DashboardData> => {
    const [all, published, categories] = await Promise.all([
      listAdministratorEstablishments({ page: 1, pageSize: 1 }, { signal }),
      listAdministratorEstablishments({ page: 1, pageSize: 1, status: 'published' }, { signal }),
      listAdministratorCategories({ signal }),
    ])
    return { total: all.meta.total, published: published.meta.total, categories: categories.length }
  }, []))

  useEffect(() => {
    if (dashboard.error instanceof AdministratorApiError && dashboard.error.status === 401) clearExpiredSession()
  }, [clearExpiredSession, dashboard.error])

  if (dashboard.loading) return <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8" role="status"><h1 className="text-3xl font-black text-navy-950">Loading administrator overview…</h1></div>
  if (dashboard.error) return <div className="mx-auto max-w-3xl px-4 py-20 text-center" role="alert"><h1 className="text-3xl font-black text-navy-950">The administrator overview is unavailable</h1><p className="mt-3 text-slate-600">{dashboard.error.message}</p><button type="button" onClick={dashboard.retry} className="mt-6 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-bold text-white">Retry</button></div>
  if (!dashboard.data) return null

  const cards = [
    { label: 'Total entities', value: dashboard.data.total, note: 'All administrator records' },
    { label: 'Published entities', value: dashboard.data.published, note: 'Visible in the public directory' },
    { label: 'Unpublished entities', value: dashboard.data.total - dashboard.data.published, note: 'Not visible to the public' },
    { label: 'Available categories', value: dashboard.data.categories, note: 'Configured for administrator use' },
  ]

  return <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-black tracking-[0.16em] text-teal-700 uppercase">Administrator workspace</p><h1 className="mt-2 text-3xl font-black tracking-tight text-navy-950 sm:text-4xl">Registry overview</h1><p className="mt-3 max-w-2xl leading-7 text-slate-600">Manage Specified Entity records and categories. Publication changes take effect in the public directory through the protected API.</p></div><Link to="/admin/establishments/new" className="inline-flex w-fit rounded-lg bg-teal-700 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-teal-600">Add entity</Link></div>
    <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <section key={card.label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-bold text-slate-500">{card.label}</p><p className="mt-3 text-4xl font-black tracking-tight text-navy-950">{card.value}</p><p className="mt-2 text-sm text-slate-600">{card.note}</p></section>)}</div>
    <section className="mt-10 grid gap-5 md:grid-cols-2"><Link to="/admin/establishments" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-700/35 hover:shadow-md"><p className="text-sm font-black tracking-[0.16em] text-teal-700 uppercase">Entities</p><h2 className="mt-2 text-xl font-black text-navy-950">Manage registry records</h2><p className="mt-3 leading-6 text-slate-600">Create, edit, publish, unpublish, or delete administrator records.</p><span className="mt-5 inline-flex text-sm font-bold text-teal-700">Open entities →</span></Link><Link to="/admin/categories" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-700/35 hover:shadow-md"><p className="text-sm font-black tracking-[0.16em] text-teal-700 uppercase">Categories</p><h2 className="mt-2 text-xl font-black text-navy-950">Maintain categories</h2><p className="mt-3 leading-6 text-slate-600">Create, edit, and safely remove unused category definitions.</p><span className="mt-5 inline-flex text-sm font-bold text-teal-700">Open categories →</span></Link></section>
  </div>
}

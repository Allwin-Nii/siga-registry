import { useCallback, useEffect } from 'react'
import { Building2, CircleCheckBig, EyeOff, FileText, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AdministratorApiError, getAdministratorAnalytics, type AdministratorAnalytics } from '../api/adminApi'
import { usePublicApiResource } from '../api/usePublicApiResource'
import { DonutChart, RegionBarChart } from '../components/AdminAnalyticsCharts'
import { useAdminAuth } from '../state/useAdminAuth'

const categoryPresentation: Record<string, { name: string; color: string }> = {
  SOE: { name: 'State-Owned Enterprises', color: '#0d766e' },
  JVC: { name: 'Joint Venture Companies', color: '#2563eb' },
  OSE: { name: 'Other Specified Entities', color: '#d97706' },
}

const fallbackCategoryColor = '#64748b'
function DashboardSkeleton() {
  return <div className="mx-auto max-w-360 px-4 py-5 sm:px-6 lg:px-8" role="status" aria-label="Loading administrator analytics">
    <div className="h-8 w-36 animate-pulse rounded bg-slate-200" /><div className="mt-2 h-4 w-72 max-w-full animate-pulse rounded bg-slate-100" />
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-25 animate-pulse rounded-2xl border border-slate-200 bg-white" />)}</div>
    <div className="mt-4 grid gap-4 xl:grid-cols-2">{Array.from({ length: 2 }, (_, index) => <div key={index} className="h-52 animate-pulse rounded-2xl border border-slate-200 bg-white" />)}</div>
  </div>
}

function DashboardContent({ analytics }: { analytics: AdministratorAnalytics }) {
  const statistics = [
    { label: 'Total Entities', value: analytics.totals.establishments, detail: 'All registry records', icon: Building2, tone: 'bg-navy-950 text-white', iconTone: 'bg-white/15 text-white' },
    { label: 'Published', value: analytics.totals.published, detail: 'Visible in the public directory', icon: CircleCheckBig, tone: 'bg-white text-navy-950', iconTone: 'bg-teal-100 text-teal-700' },
    { label: 'Drafts', value: analytics.totals.drafts, detail: 'Still being prepared', icon: FileText, tone: 'bg-white text-navy-950', iconTone: 'bg-slate-100 text-slate-700' },
    { label: 'Unpublished Entities', value: analytics.totals.unpublished, detail: 'Not visible in the public directory', icon: EyeOff, tone: 'bg-white text-navy-950', iconTone: 'bg-amber-50 text-amber-700' },
  ]
  return <div className="mx-auto max-w-360 px-4 py-5 sm:px-6 lg:px-8">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-[11px] font-black tracking-[0.16em] text-teal-700 uppercase">Administrator workspace</p><h1 className="mt-1 text-3xl font-black tracking-tight text-navy-950">Overview</h1><p className="mt-1 text-sm text-slate-600">Registry analytics and entity insights</p></div>
      <Link to="/admin/establishments/new" className="inline-flex w-fit items-center gap-2 rounded-lg bg-teal-700 px-3.5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-teal-600"><Plus className="h-4 w-4" aria-hidden="true" />Add Entity</Link>
    </div>

    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{statistics.map((statistic) => {
      const Icon = statistic.icon
      return <section key={statistic.label} className={`rounded-2xl border border-slate-200 p-4 shadow-sm ${statistic.tone}`}><div className="flex items-start justify-between gap-3"><div><p className={`text-xs font-bold ${statistic.label === 'Total Entities' ? 'text-slate-200' : 'text-slate-500'}`}>{statistic.label}</p><p className="mt-1.5 text-3xl font-black tracking-tight">{statistic.value.toLocaleString()}</p></div><span className={`inline-flex rounded-lg p-2 ${statistic.iconTone}`}><Icon className="h-4 w-4" aria-hidden="true" /></span></div><p className={`mt-1.5 text-[11px] ${statistic.label === 'Total Entities' ? 'text-slate-300' : 'text-slate-500'}`}>{statistic.detail}</p></section>
    })}</div>

    <div className="mt-4 grid gap-4 xl:grid-cols-2">
      <DonutChart title="Entities by category" centreLabel="entities" singularNoun="entity" pluralNoun="entities" series={analytics.categories.map((category) => {
        const presentation = categoryPresentation[category.code]
        return {
          label: `${category.code} — ${presentation?.name ?? category.name}`,
          value: category.count,
          color: presentation?.color ?? fallbackCategoryColor,
        }
      })} />
      <RegionBarChart regions={analytics.regions} />
    </div>
  </div>
}

export function AdminDashboardPage() {
  const { clearExpiredSession } = useAdminAuth()
  const dashboard = usePublicApiResource(useCallback((signal: AbortSignal) => getAdministratorAnalytics({ signal }), []))

  useEffect(() => {
    if (dashboard.error instanceof AdministratorApiError && dashboard.error.status === 401) clearExpiredSession()
  }, [clearExpiredSession, dashboard.error])

  if (dashboard.loading) return <DashboardSkeleton />
  if (dashboard.error) return <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6" role="alert"><h1 className="text-3xl font-black text-navy-950">The administrator overview is unavailable</h1><p className="mt-3 text-slate-600">{dashboard.error.message}</p><button type="button" onClick={dashboard.retry} className="mt-6 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-900">Retry analytics</button></div>
  return dashboard.data ? <DashboardContent analytics={dashboard.data} /> : null
}

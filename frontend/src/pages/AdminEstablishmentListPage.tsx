import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AdministratorApiError, deleteAdministratorEstablishment, listAdministratorEstablishments, setAdministratorPublication, type AdministratorEstablishment, type AdministratorWorkflowStatus } from '../api/adminApi'
import { usePublicApiResource } from '../api/usePublicApiResource'
import { AdministratorStatusBadge } from '../components/AdministratorStatusBadge'
import { useAdminAuth } from '../state/useAdminAuth'

const pageSize = 20
const statuses: Array<{ value: '' | AdministratorWorkflowStatus; label: string }> = [
  { value: '', label: 'All records' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Unpublished' },
]

const toPageNumber = (value: string | null) => {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1
}

export function AdminEstablishmentListPage() {
  const [params, setParams] = useSearchParams()
  const { csrfToken, clearExpiredSession } = useAdminAuth()
  const [message, setMessage] = useState('')
  const [operationError, setOperationError] = useState('')
  const [deleting, setDeleting] = useState<AdministratorEstablishment | undefined>()
  const page = toPageNumber(params.get('page'))
  const requestedStatus = params.get('status') as AdministratorWorkflowStatus | null
  const status = statuses.some((item) => item.value === requestedStatus) ? requestedStatus ?? '' : ''
  const establishments = usePublicApiResource(useCallback(
    (signal: AbortSignal) => listAdministratorEstablishments({ page, pageSize, ...(status ? { status } : {}) }, { signal }),
    [page, status],
  ))

  useEffect(() => {
    if (establishments.error instanceof AdministratorApiError && establishments.error.status === 401) clearExpiredSession()
  }, [clearExpiredSession, establishments.error])

  const updateParams = (nextPage: number, nextStatus = status) => setParams((current) => {
    const next = new URLSearchParams(current)
    if (nextPage > 1) next.set('page', String(nextPage))
    else next.delete('page')
    if (nextStatus) next.set('status', nextStatus)
    else next.delete('status')
    return next
  })

  const handleError = (error: unknown) => {
    if (error instanceof AdministratorApiError && error.status === 401) clearExpiredSession()
    setOperationError(error instanceof Error ? error.message : 'The requested operation could not be completed.')
  }

  const changePublication = async (establishment: AdministratorEstablishment) => {
    setMessage('')
    setOperationError('')
    try {
      await setAdministratorPublication(establishment.id, establishment.workflowStatus !== 'published', csrfToken ?? '')
      setMessage(establishment.workflowStatus === 'published' ? 'Entity unpublished.' : 'Entity published.')
      establishments.retry()
    } catch (error) {
      handleError(error)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setMessage('')
    setOperationError('')
    try {
      await deleteAdministratorEstablishment(deleting.id, csrfToken ?? '')
      setMessage('Entity deleted.')
      setDeleting(undefined)
      establishments.retry()
    } catch (error) {
      handleError(error)
    }
  }

  return <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-black tracking-[0.16em] text-teal-700 uppercase">Administrator workspace</p><h1 className="mt-2 text-3xl font-black tracking-tight text-navy-950 sm:text-4xl">Entities</h1><p className="mt-3 leading-7 text-slate-600">Manage all Specified Entity records and their public publication state.</p></div><Link to="/admin/establishments/new" className="inline-flex w-fit rounded-lg bg-teal-700 px-5 py-3 text-sm font-bold text-white hover:bg-teal-600">Add entity</Link></div>
    <fieldset className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><legend className="sr-only">Entity publication filter</legend><div className="flex flex-wrap gap-2">{statuses.map((item) => <button type="button" key={item.label} aria-pressed={status === item.value} onClick={() => updateParams(1, item.value)} className={`rounded-full px-4 py-2 text-sm font-bold ${status === item.value ? 'bg-navy-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{item.label}</button>)}</div></fieldset>
    {message && <p className="mt-6 rounded-xl border border-teal-700/20 bg-teal-100 p-4 text-sm text-teal-800" role="status">{message}</p>}
    {operationError && <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{operationError}</p>}
    {deleting && <section className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5" role="alertdialog" aria-labelledby="delete-entity-title"><h2 id="delete-entity-title" className="font-black text-navy-950">Delete {deleting.name}?</h2><p className="mt-2 text-sm leading-6 text-slate-700">This permanently removes the entity record. This action cannot be undone.</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={() => void confirmDelete()} className="rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-800">Confirm delete</button><button type="button" onClick={() => setDeleting(undefined)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-white">Cancel</button></div></section>}
    <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-live="polite">
      {establishments.loading && <div className="p-8" role="status">Loading entity records…</div>}
      {establishments.error && <div className="p-8" role="alert"><p className="font-bold text-navy-950">Unable to load entity records</p><p className="mt-2 text-sm text-slate-600">{establishments.error.message}</p><button type="button" onClick={establishments.retry} className="mt-4 font-bold text-teal-700">Retry</button></div>}
      {establishments.data && (establishments.data.data.length ? <><div className="overflow-x-auto"><table className="w-full min-w-200 text-left text-sm"><caption className="sr-only">Administrator entity records</caption><thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase"><tr><th className="px-6 py-3 font-bold">Entity</th><th className="px-6 py-3 font-bold">Category</th><th className="px-6 py-3 font-bold">Status</th><th className="px-6 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-slate-100">{establishments.data.data.map((record) => <tr key={record.id} className="hover:bg-slate-50"><td className="px-6 py-4"><p className="font-bold text-navy-950">{record.name}</p><p className="mt-1 text-xs text-slate-500">/{record.slug}</p></td><td className="px-6 py-4 text-slate-600">{record.category.code} — {record.category.description}</td><td className="px-6 py-4"><AdministratorStatusBadge status={record.workflowStatus} /></td><td className="px-6 py-4"><div className="flex flex-wrap justify-end gap-3"><Link to={`/admin/establishments/${record.id}/edit`} state={{ establishment: record }} className="font-bold text-teal-700 hover:text-teal-600" aria-label={`Edit ${record.name}`}>Edit<span className="sr-only"> {record.name}</span></Link><button type="button" onClick={() => void changePublication(record)} className="font-bold text-navy-900 hover:text-teal-700" aria-label={`${record.workflowStatus === 'published' ? 'Unpublish' : 'Publish'} ${record.name}`}>{record.workflowStatus === 'published' ? 'Unpublish' : 'Publish'}<span className="sr-only"> {record.name}</span></button><button type="button" onClick={() => setDeleting(record)} className="font-bold text-rose-700 hover:text-rose-800" aria-label={`Delete ${record.name}`}>Delete<span className="sr-only"> {record.name}</span></button></div></td></tr>)}</tbody></table></div>{establishments.data.meta.totalPages > 1 && <nav aria-label="Entity pagination" className="flex items-center justify-center gap-4 border-t border-slate-200 p-5"><button type="button" disabled={establishments.data.meta.page <= 1} onClick={() => updateParams(establishments.data!.meta.page - 1)} className="rounded-lg border border-navy-900 px-4 py-2 text-sm font-bold text-navy-900 disabled:opacity-40">Previous</button><span className="text-sm text-slate-600">Page {establishments.data.meta.page} of {establishments.data.meta.totalPages}</span><button type="button" disabled={establishments.data.meta.page >= establishments.data.meta.totalPages} onClick={() => updateParams(establishments.data!.meta.page + 1)} className="rounded-lg border border-navy-900 px-4 py-2 text-sm font-bold text-navy-900 disabled:opacity-40">Next</button></nav>}</> : <div className="p-10 text-center"><h2 className="font-black text-navy-950">No entity records found</h2><p className="mt-2 text-sm text-slate-600">Create an entity to begin managing registry content.</p></div>)}
    </section>
  </div>
}

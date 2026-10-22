import { type FormEvent, useCallback, useEffect, useReducer, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AdministratorApiError, listAdministratorCategories, listAdministratorEstablishments, createAdministratorEstablishment, updateAdministratorEstablishment, type AdministratorEstablishment, type AdministratorEstablishmentInput } from '../api/adminApi'
import { usePublicApiResource } from '../api/usePublicApiResource'
import { useAdminAuth } from '../state/useAdminAuth'

type FormPageData = {
  categories: Awaited<ReturnType<typeof listAdministratorCategories>>
  establishment?: AdministratorEstablishment
}

const emptyValues: AdministratorEstablishmentInput = {
  name: '', website: '', categoryId: '', email: '', contactNumber: '', summary: '',
}

type FormValuesAction =
  | { type: 'field'; field: keyof AdministratorEstablishmentInput; value: string }
  | { type: 'reset'; values: AdministratorEstablishmentInput }

const formValuesReducer = (state: AdministratorEstablishmentInput, action: FormValuesAction): AdministratorEstablishmentInput => {
  if (action.type === 'field') return { ...state, [action.field]: action.value }
  return action.values
}

const toFormValues = (establishment: AdministratorEstablishment): AdministratorEstablishmentInput => ({
  name: establishment.name,
  website: establishment.website ?? '',
  categoryId: establishment.category.code,
  email: establishment.email ?? '',
  contactNumber: establishment.contactNumber ?? '',
  summary: establishment.summary,
})

const findEstablishment = async (id: number, signal: AbortSignal) => {
  const firstPage = await listAdministratorEstablishments({ page: 1, pageSize: 100 }, { signal })
  const firstMatch = firstPage.data.find((record) => record.id === id)
  if (firstMatch) return firstMatch
  for (let page = 2; page <= firstPage.meta.totalPages; page += 1) {
    const result = await listAdministratorEstablishments({ page, pageSize: 100 }, { signal })
    const match = result.data.find((record) => record.id === id)
    if (match) return match
  }
  throw new AdministratorApiError('The establishment record was not found.', 404, 'NOT_FOUND')
}

export function AdminEstablishmentFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { recordId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { csrfToken, clearExpiredSession } = useAdminAuth()
  const parsedId = recordId && /^\d+$/.test(recordId) ? Number(recordId) : undefined
  const stateRecord = (location.state as { establishment?: AdministratorEstablishment } | null)?.establishment
  const initialRecord = mode === 'edit' && stateRecord?.id === parsedId ? stateRecord : undefined
  const [values, dispatchValues] = useReducer(formValuesReducer, initialRecord ? toFormValues(initialRecord) : emptyValues)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const resource = usePublicApiResource(useCallback(async (signal: AbortSignal): Promise<FormPageData> => {
    const categories = await listAdministratorCategories({ signal })
    if (mode === 'create') return { categories }
    if (!parsedId) throw new AdministratorApiError('The establishment record was not found.', 404, 'NOT_FOUND')
    return { categories, establishment: initialRecord ?? await findEstablishment(parsedId, signal) }
  }, [initialRecord, mode, parsedId]))

  useEffect(() => {
    if (resource.error instanceof AdministratorApiError && resource.error.status === 401) clearExpiredSession()
  }, [clearExpiredSession, resource.error])

  useEffect(() => {
    if (resource.data?.establishment) dispatchValues({ type: 'reset', values: toFormValues(resource.data.establishment) })
  }, [resource.data?.establishment])

  const setField = (field: keyof AdministratorEstablishmentInput, value: string) => {
    dispatchValues({ type: 'field', field, value })
    setFieldErrors((current) => ({ ...current, [field]: '' }))
    setFormError('')
    setSuccess('')
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setFieldErrors({})
    setFormError('')
    setSuccess('')
    try {
      const saved = mode === 'create'
        ? await createAdministratorEstablishment(values, csrfToken ?? '')
        : await updateAdministratorEstablishment(parsedId!, values, csrfToken ?? '')
      if (mode === 'create') {
        navigate(`/admin/establishments/${saved.id}/edit`, { replace: true, state: { establishment: saved } })
        return
      }
      dispatchValues({ type: 'reset', values: toFormValues(saved) })
      setSuccess('Establishment changes saved.')
    } catch (error) {
      if (error instanceof AdministratorApiError && error.status === 401) clearExpiredSession()
      if (error instanceof AdministratorApiError && error.details) setFieldErrors(error.details)
      setFormError(error instanceof Error ? error.message : 'The establishment could not be saved.')
    } finally {
      setSubmitting(false)
    }
  }

  if (resource.loading) return <div className="mx-auto max-w-3xl px-4 py-20 text-center" role="status">Loading establishment form…</div>
  if (resource.error) {
    const missing = resource.error instanceof AdministratorApiError && resource.error.status === 404
    return <div className="mx-auto max-w-3xl px-4 py-20 text-center" role="alert"><h1 className="text-3xl font-black text-navy-950">{missing ? 'Establishment not found' : 'The establishment form is unavailable'}</h1><p className="mt-3 text-slate-600">{missing ? 'That administrator record is unavailable.' : resource.error.message}</p><Link to="/admin/establishments" className="mt-6 inline-flex rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-bold text-white">Back to establishments</Link></div>
  }
  if (!resource.data) return null

  const title = mode === 'create' ? 'Add establishment' : 'Edit establishment'
  const fieldClass = (field: keyof AdministratorEstablishmentInput) => `mt-2 w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 ${fieldErrors[field] ? 'border-rose-600 bg-rose-50' : 'border-slate-300 bg-white'} focus:border-teal-700`

  return <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
    <Link to="/admin/establishments" className="text-sm font-bold text-teal-700 hover:text-teal-600">← Back to establishments</Link>
    <div className="mt-6"><p className="text-sm font-black tracking-[0.16em] text-teal-700 uppercase">Administrator workspace</p><h1 className="mt-2 text-3xl font-black tracking-tight text-navy-950 sm:text-4xl">{title}</h1><p className="mt-3 leading-7 text-slate-600">Provide the six approved establishment information fields. New establishments remain unpublished until you publish them from the listing.</p></div>
    {success && <p className="mt-6 rounded-xl border border-teal-700/20 bg-teal-100 p-4 text-sm text-teal-800" role="status">{success}</p>}
    {formError && <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{formError}</p>}
    <form noValidate onSubmit={(event) => void submit(event)} className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="grid gap-6 sm:grid-cols-2">
      <div className="sm:col-span-2"><label className="text-sm font-bold text-slate-700" htmlFor="admin-record-name">Name <span className="text-rose-700">*</span></label><input id="admin-record-name" value={values.name} onChange={(event) => setField('name', event.target.value)} aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? 'admin-record-name-error' : undefined} className={fieldClass('name')} />{fieldErrors.name && <p id="admin-record-name-error" className="mt-1 text-sm text-rose-700">{fieldErrors.name}</p>}</div>
      <div><label className="text-sm font-bold text-slate-700" htmlFor="admin-record-website">Website URL</label><input id="admin-record-website" type="url" value={values.website} onChange={(event) => setField('website', event.target.value)} aria-invalid={Boolean(fieldErrors.website)} aria-describedby={fieldErrors.website ? 'admin-record-website-error' : undefined} className={fieldClass('website')} placeholder="https://example.test" />{fieldErrors.website && <p id="admin-record-website-error" className="mt-1 text-sm text-rose-700">{fieldErrors.website}</p>}</div>
      <div><label className="text-sm font-bold text-slate-700" htmlFor="admin-record-category">Category <span className="text-rose-700">*</span></label><select id="admin-record-category" value={values.categoryId} onChange={(event) => setField('categoryId', event.target.value)} aria-invalid={Boolean(fieldErrors.categoryId)} aria-describedby={fieldErrors.categoryId ? 'admin-record-category-error' : undefined} className={fieldClass('categoryId')}><option value="">Select a category</option>{resource.data.categories.map((category) => <option key={category.id} value={category.code}>{category.code} — {category.description}</option>)}</select>{fieldErrors.categoryId && <p id="admin-record-category-error" className="mt-1 text-sm text-rose-700">{fieldErrors.categoryId}</p>}</div>
      <div><label className="text-sm font-bold text-slate-700" htmlFor="admin-record-email">Email</label><input id="admin-record-email" type="email" value={values.email} onChange={(event) => setField('email', event.target.value)} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'admin-record-email-error' : undefined} className={fieldClass('email')} />{fieldErrors.email && <p id="admin-record-email-error" className="mt-1 text-sm text-rose-700">{fieldErrors.email}</p>}</div>
      <div><label className="text-sm font-bold text-slate-700" htmlFor="admin-record-contact">Contact Number</label><input id="admin-record-contact" type="tel" value={values.contactNumber} onChange={(event) => setField('contactNumber', event.target.value)} aria-invalid={Boolean(fieldErrors.contactNumber)} aria-describedby={fieldErrors.contactNumber ? 'admin-record-contact-error' : undefined} className={fieldClass('contactNumber')} />{fieldErrors.contactNumber && <p id="admin-record-contact-error" className="mt-1 text-sm text-rose-700">{fieldErrors.contactNumber}</p>}</div>
      <div className="sm:col-span-2"><label className="text-sm font-bold text-slate-700" htmlFor="admin-record-summary">Brief Description <span className="text-rose-700">*</span></label><textarea id="admin-record-summary" rows={6} value={values.summary} onChange={(event) => setField('summary', event.target.value)} aria-invalid={Boolean(fieldErrors.summary)} aria-describedby={fieldErrors.summary ? 'admin-record-summary-error' : undefined} className={fieldClass('summary')} />{fieldErrors.summary && <p id="admin-record-summary-error" className="mt-1 text-sm text-rose-700">{fieldErrors.summary}</p>}</div>
    </div><div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-6"><Link to="/admin/establishments" className="rounded-lg px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100">Cancel</Link><button type="submit" disabled={submitting} className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60 hover:bg-teal-600">{submitting ? 'Saving…' : mode === 'create' ? 'Create establishment' : 'Save changes'}</button></div></form>
  </div>
}

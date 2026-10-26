import { type FormEvent, useCallback, useEffect, useReducer, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AdministratorApiError, listAdministratorCategories, listAdministratorEstablishments, createAdministratorEstablishment, updateAdministratorEstablishment, type AdministratorEstablishment, type AdministratorEstablishmentInput, type AdministratorManagementMemberInput } from '../api/adminApi'
import { usePublicApiResource } from '../api/usePublicApiResource'
import { useAdminAuth } from '../state/useAdminAuth'

type FormPageData = {
  categories: Awaited<ReturnType<typeof listAdministratorCategories>>
  establishment?: AdministratorEstablishment
}

type FormManagementMember = Omit<AdministratorManagementMemberInput, 'officialEmail' | 'officialPhone'> & {
  key: string
  officialEmail: string
  officialPhone: string
}
type FormValues = Omit<AdministratorEstablishmentInput, 'management'> & { management: FormManagementMember[] }
type GeneralField = Exclude<keyof FormValues, 'management'>
type ManagementField = keyof AdministratorManagementMemberInput

const managementKey = () => `management-${Date.now()}-${Math.random().toString(36).slice(2)}`

const emptyValues: FormValues = {
  name: '', website: '', logoUrl: '', categoryId: '', email: '', contactNumber: '', summary: '',
  region: '', city: '', physicalAddress: '', gpsAddress: '', latitude: '', longitude: '', management: [],
}

type FormValuesAction =
  | { type: 'field'; field: GeneralField; value: string }
  | { type: 'management-field'; key: string; field: ManagementField; value: string }
  | { type: 'add-management' }
  | { type: 'remove-management'; key: string }
  | { type: 'move-management'; key: string; direction: -1 | 1 }
  | { type: 'reset'; values: FormValues }

const formValuesReducer = (state: FormValues, action: FormValuesAction): FormValues => {
  if (action.type === 'field') return { ...state, [action.field]: action.value }
  if (action.type === 'management-field') {
    return { ...state, management: state.management.map((member) => member.key === action.key ? { ...member, [action.field]: action.value } : member) }
  }
  if (action.type === 'add-management') {
    return { ...state, management: [...state.management, { key: managementKey(), fullName: '', position: '', officialEmail: '', officialPhone: '' }] }
  }
  if (action.type === 'remove-management') return { ...state, management: state.management.filter((member) => member.key !== action.key) }
  if (action.type === 'move-management') {
    const index = state.management.findIndex((member) => member.key === action.key)
    const destination = index + action.direction
    if (index < 0 || destination < 0 || destination >= state.management.length) return state
    const management = [...state.management]
    ;[management[index], management[destination]] = [management[destination], management[index]]
    return { ...state, management }
  }
  return action.values
}

const toFormValues = (establishment: AdministratorEstablishment): FormValues => ({
  name: establishment.name,
  website: establishment.website ?? '',
  logoUrl: establishment.logoUrl ?? '',
  categoryId: establishment.category.code,
  email: establishment.email ?? '',
  contactNumber: establishment.contactNumber ?? '',
  summary: establishment.summary,
  region: establishment.region ?? '',
  city: establishment.city ?? '',
  physicalAddress: establishment.physicalAddress ?? '',
  gpsAddress: establishment.gpsAddress ?? '',
  latitude: establishment.latitude === null || establishment.latitude === undefined ? '' : String(establishment.latitude),
  longitude: establishment.longitude === null || establishment.longitude === undefined ? '' : String(establishment.longitude),
  management: (establishment.management ?? []).map((member) => ({
    key: `persisted-${member.id}`,
    fullName: member.fullName,
    position: member.position,
    officialEmail: member.officialEmail ?? '',
    officialPhone: member.officialPhone ?? '',
  })),
})

const toApiInput = (values: FormValues): AdministratorEstablishmentInput => ({
  ...values,
  management: values.management.map(({ key: _key, ...member }) => member),
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
  throw new AdministratorApiError('The entity record was not found.', 404, 'NOT_FOUND')
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
    if (!parsedId) throw new AdministratorApiError('The entity record was not found.', 404, 'NOT_FOUND')
    return { categories, establishment: initialRecord ?? await findEstablishment(parsedId, signal) }
  }, [initialRecord, mode, parsedId]))

  useEffect(() => {
    if (resource.error instanceof AdministratorApiError && resource.error.status === 401) clearExpiredSession()
  }, [clearExpiredSession, resource.error])

  useEffect(() => {
    if (resource.data?.establishment) dispatchValues({ type: 'reset', values: toFormValues(resource.data.establishment) })
  }, [resource.data?.establishment])

  const setField = (field: GeneralField, value: string) => {
    dispatchValues({ type: 'field', field, value })
    setFieldErrors((current) => ({ ...current, [field]: '' }))
    setFormError('')
    setSuccess('')
  }

  const setManagementField = (key: string, index: number, field: ManagementField, value: string) => {
    dispatchValues({ type: 'management-field', key, field, value })
    setFieldErrors((current) => ({ ...current, [`management.${index}.${field}`]: '' }))
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
      const input = toApiInput(values)
      const saved = mode === 'create'
        ? await createAdministratorEstablishment(input, csrfToken ?? '')
        : await updateAdministratorEstablishment(parsedId!, input, csrfToken ?? '')
      if (mode === 'create') {
        navigate(`/admin/establishments/${saved.id}/edit`, { replace: true, state: { establishment: saved } })
        return
      }
      dispatchValues({ type: 'reset', values: toFormValues(saved) })
      setSuccess('Entity changes saved.')
    } catch (error) {
      if (error instanceof AdministratorApiError && error.status === 401) clearExpiredSession()
      if (error instanceof AdministratorApiError && error.details) setFieldErrors(error.details)
      setFormError(error instanceof Error ? error.message : 'The entity could not be saved.')
    } finally {
      setSubmitting(false)
    }
  }

  if (resource.loading) return <div className="mx-auto max-w-3xl px-4 py-20 text-center" role="status">Loading entity form…</div>
  if (resource.error) {
    const missing = resource.error instanceof AdministratorApiError && resource.error.status === 404
    return <div className="mx-auto max-w-3xl px-4 py-20 text-center" role="alert"><h1 className="text-3xl font-black text-navy-950">{missing ? 'Entity not found' : 'The entity form is unavailable'}</h1><p className="mt-3 text-slate-600">{missing ? 'That administrator record is unavailable.' : resource.error.message}</p><Link to="/admin/establishments" className="mt-6 inline-flex rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-bold text-white">Back to entities</Link></div>
  }
  if (!resource.data) return null

  const title = mode === 'create' ? 'Add entity' : 'Edit entity'
  const fieldClass = (field: string) => `mt-2 w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 ${fieldErrors[field] ? 'border-rose-600 bg-rose-50' : 'border-slate-300 bg-white'} focus:border-teal-700`
  const managementError = (index: number, field: ManagementField) => fieldErrors[`management.${index}.${field}`]

  return <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
    <Link to="/admin/establishments" className="text-sm font-bold text-teal-700 hover:text-teal-600">← Back to entities</Link>
    <div className="mt-6"><p className="text-sm font-black tracking-[0.16em] text-teal-700 uppercase">Administrator workspace</p><h1 className="mt-2 text-3xl font-black tracking-tight text-navy-950 sm:text-4xl">{title}</h1><p className="mt-3 leading-7 text-slate-600">Maintain the institution profile, verified location details, and its management contacts. New entities remain unpublished until you publish them from the listing.</p></div>
    {success && <p className="mt-6 rounded-xl border border-teal-700/20 bg-teal-100 p-4 text-sm text-teal-800" role="status">{success}</p>}
    {formError && <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{formError}</p>}
    <form noValidate onSubmit={(event) => void submit(event)} className="mt-8 space-y-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <section aria-labelledby="general-information-heading"><h2 id="general-information-heading" className="text-xl font-black text-navy-950">General information</h2><div className="mt-5 grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="text-sm font-bold text-slate-700" htmlFor="admin-record-name">Name <span className="text-rose-700">*</span></label><input id="admin-record-name" value={values.name} onChange={(event) => setField('name', event.target.value)} aria-invalid={Boolean(fieldErrors.name)} className={fieldClass('name')} />{fieldErrors.name && <p className="mt-1 text-sm text-rose-700">{fieldErrors.name}</p>}</div>
        <div><label className="text-sm font-bold text-slate-700" htmlFor="admin-record-category">Category <span className="text-rose-700">*</span></label><select id="admin-record-category" value={values.categoryId} onChange={(event) => setField('categoryId', event.target.value)} aria-invalid={Boolean(fieldErrors.categoryId)} className={fieldClass('categoryId')}><option value="">Select a category</option>{resource.data.categories.map((category) => <option key={category.id} value={category.code}>{category.code} — {category.description}</option>)}</select>{fieldErrors.categoryId && <p className="mt-1 text-sm text-rose-700">{fieldErrors.categoryId}</p>}</div>
        <div className="sm:col-span-2"><label className="text-sm font-bold text-slate-700" htmlFor="admin-record-summary">Brief Description <span className="text-rose-700">*</span></label><textarea id="admin-record-summary" rows={6} value={values.summary} onChange={(event) => setField('summary', event.target.value)} aria-invalid={Boolean(fieldErrors.summary)} className={fieldClass('summary')} />{fieldErrors.summary && <p className="mt-1 text-sm text-rose-700">{fieldErrors.summary}</p>}</div>
      </div></section>
      <section aria-labelledby="institution-logo-heading" className="border-t border-slate-200 pt-8"><h2 id="institution-logo-heading" className="text-xl font-black text-navy-950">Institution logo</h2><p className="mt-2 text-sm text-slate-600">Use the official HTTPS image URL. Images are displayed without cropping in the public profile.</p><label className="mt-5 block text-sm font-bold text-slate-700" htmlFor="admin-record-logo">Logo URL</label><input id="admin-record-logo" type="url" value={values.logoUrl} onChange={(event) => setField('logoUrl', event.target.value)} aria-invalid={Boolean(fieldErrors.logoUrl)} className={fieldClass('logoUrl')} placeholder="https://example.gov.gh/logo.png" />{fieldErrors.logoUrl && <p className="mt-1 text-sm text-rose-700">{fieldErrors.logoUrl}</p>}{values.logoUrl && <div className="mt-4 flex h-24 w-40 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-3"><img src={values.logoUrl} alt="Institution logo preview" className="max-h-full max-w-full object-contain" /></div>}</section>
      <section aria-labelledby="location-information-heading" className="border-t border-slate-200 pt-8"><h2 id="location-information-heading" className="text-xl font-black text-navy-950">Location information</h2><div className="mt-5 grid gap-6 sm:grid-cols-2">
        <div><label className="text-sm font-bold text-slate-700" htmlFor="admin-record-region">Region</label><input id="admin-record-region" value={values.region} onChange={(event) => setField('region', event.target.value)} className={fieldClass('region')} />{fieldErrors.region && <p className="mt-1 text-sm text-rose-700">{fieldErrors.region}</p>}</div>
        <div><label className="text-sm font-bold text-slate-700" htmlFor="admin-record-city">City</label><input id="admin-record-city" value={values.city} onChange={(event) => setField('city', event.target.value)} className={fieldClass('city')} />{fieldErrors.city && <p className="mt-1 text-sm text-rose-700">{fieldErrors.city}</p>}</div>
        <div className="sm:col-span-2"><label className="text-sm font-bold text-slate-700" htmlFor="admin-record-address">Physical address</label><textarea id="admin-record-address" rows={3} value={values.physicalAddress} onChange={(event) => setField('physicalAddress', event.target.value)} className={fieldClass('physicalAddress')} />{fieldErrors.physicalAddress && <p className="mt-1 text-sm text-rose-700">{fieldErrors.physicalAddress}</p>}</div>
        <div><label className="text-sm font-bold text-slate-700" htmlFor="admin-record-gps">GhanaPost GPS address</label><input id="admin-record-gps" value={values.gpsAddress} onChange={(event) => setField('gpsAddress', event.target.value)} className={fieldClass('gpsAddress')} placeholder="GA-123-4567" />{fieldErrors.gpsAddress && <p className="mt-1 text-sm text-rose-700">{fieldErrors.gpsAddress}</p>}</div>
        <div className="grid grid-cols-2 gap-3"><div><label className="text-sm font-bold text-slate-700" htmlFor="admin-record-latitude">Latitude</label><input id="admin-record-latitude" inputMode="decimal" value={values.latitude} onChange={(event) => setField('latitude', event.target.value)} className={fieldClass('latitude')} /></div><div><label className="text-sm font-bold text-slate-700" htmlFor="admin-record-longitude">Longitude</label><input id="admin-record-longitude" inputMode="decimal" value={values.longitude} onChange={(event) => setField('longitude', event.target.value)} className={fieldClass('longitude')} /></div></div>
        {fieldErrors.coordinates && <p className="sm:col-span-2 -mt-3 text-sm text-rose-700">{fieldErrors.coordinates}</p>}
      </div></section>
      <section aria-labelledby="official-contact-heading" className="border-t border-slate-200 pt-8"><h2 id="official-contact-heading" className="text-xl font-black text-navy-950">Official contact information</h2><div className="mt-5 grid gap-6 sm:grid-cols-2">
        <div><label className="text-sm font-bold text-slate-700" htmlFor="admin-record-website">Website URL</label><input id="admin-record-website" type="url" value={values.website} onChange={(event) => setField('website', event.target.value)} aria-invalid={Boolean(fieldErrors.website)} className={fieldClass('website')} placeholder="https://example.gov.gh" />{fieldErrors.website && <p className="mt-1 text-sm text-rose-700">{fieldErrors.website}</p>}</div>
        <div><label className="text-sm font-bold text-slate-700" htmlFor="admin-record-email">Email</label><input id="admin-record-email" type="email" value={values.email} onChange={(event) => setField('email', event.target.value)} aria-invalid={Boolean(fieldErrors.email)} className={fieldClass('email')} />{fieldErrors.email && <p className="mt-1 text-sm text-rose-700">{fieldErrors.email}</p>}</div>
        <div><label className="text-sm font-bold text-slate-700" htmlFor="admin-record-contact">Contact Number</label><input id="admin-record-contact" type="tel" value={values.contactNumber} onChange={(event) => setField('contactNumber', event.target.value)} aria-invalid={Boolean(fieldErrors.contactNumber)} className={fieldClass('contactNumber')} />{fieldErrors.contactNumber && <p className="mt-1 text-sm text-rose-700">{fieldErrors.contactNumber}</p>}</div>
      </div></section>
      <section aria-labelledby="management-heading" className="border-t border-slate-200 pt-8"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 id="management-heading" className="text-xl font-black text-navy-950">Management and leadership</h2><p className="mt-2 text-sm text-slate-600">Add, edit, reorder, or remove the contacts shown on the published profile.</p></div><button type="button" onClick={() => dispatchValues({ type: 'add-management' })} className="rounded-lg border border-teal-700 px-4 py-2 text-sm font-bold text-teal-700 hover:bg-teal-50">Add member</button></div>
        {fieldErrors.management && <p className="mt-4 text-sm text-rose-700">{fieldErrors.management}</p>}
        {values.management.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No management members have been added.</p> : <div className="mt-5 space-y-5">{values.management.map((member, index) => <fieldset key={member.key} className="rounded-xl border border-slate-200 p-5"><legend className="px-1 text-sm font-black text-navy-950">Member {index + 1}</legend><div className="grid gap-5 sm:grid-cols-2">
          <div><label className="text-sm font-bold text-slate-700" htmlFor={`management-${member.key}-name`}>Full name <span className="text-rose-700">*</span></label><input id={`management-${member.key}-name`} value={member.fullName} onChange={(event) => setManagementField(member.key, index, 'fullName', event.target.value)} className={fieldClass(`management.${index}.fullName`)} />{managementError(index, 'fullName') && <p className="mt-1 text-sm text-rose-700">{managementError(index, 'fullName')}</p>}</div>
          <div><label className="text-sm font-bold text-slate-700" htmlFor={`management-${member.key}-position`}>Position <span className="text-rose-700">*</span></label><input id={`management-${member.key}-position`} value={member.position} onChange={(event) => setManagementField(member.key, index, 'position', event.target.value)} className={fieldClass(`management.${index}.position`)} />{managementError(index, 'position') && <p className="mt-1 text-sm text-rose-700">{managementError(index, 'position')}</p>}</div>
          <div><label className="text-sm font-bold text-slate-700" htmlFor={`management-${member.key}-email`}>Official email</label><input id={`management-${member.key}-email`} type="email" value={member.officialEmail} onChange={(event) => setManagementField(member.key, index, 'officialEmail', event.target.value)} className={fieldClass(`management.${index}.officialEmail`)} /></div>
          <div><label className="text-sm font-bold text-slate-700" htmlFor={`management-${member.key}-phone`}>Official telephone</label><input id={`management-${member.key}-phone`} type="tel" value={member.officialPhone} onChange={(event) => setManagementField(member.key, index, 'officialPhone', event.target.value)} className={fieldClass(`management.${index}.officialPhone`)} /></div>
        </div><div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => dispatchValues({ type: 'move-management', key: member.key, direction: -1 })} disabled={index === 0} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-40">Move up</button><button type="button" onClick={() => dispatchValues({ type: 'move-management', key: member.key, direction: 1 })} disabled={index === values.management.length - 1} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-40">Move down</button><button type="button" onClick={() => dispatchValues({ type: 'remove-management', key: member.key })} className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50">Remove member</button></div></fieldset>)}</div>}
      </section>
      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-6"><Link to="/admin/establishments" className="rounded-lg px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100">Cancel</Link><button type="submit" disabled={submitting} className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60 hover:bg-teal-600">{submitting ? 'Saving…' : mode === 'create' ? 'Create entity' : 'Save changes'}</button></div>
    </form>
  </div>
}

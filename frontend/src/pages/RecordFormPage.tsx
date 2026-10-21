import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useRegistry } from '../state/useRegistry'
import type { EstablishmentFormInput, EstablishmentValidationErrors } from '../types'
import { toEstablishmentFormInput } from '../validation/establishmentValidation'

type SubmissionIntent = 'draft' | 'submit'

const initialValues: EstablishmentFormInput = { name: '', categoryId: '', website: '', email: '', contactNumber: '', summary: '' }

export function RecordFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { recordId } = useParams()
  const navigate = useNavigate()
  const { categories, findEstablishmentById, createEstablishment, updateEstablishment, submitEstablishment } = useRegistry()
  const existing = mode === 'edit' && recordId ? findEstablishmentById(recordId) : undefined
  const [values, setValues] = useState<EstablishmentFormInput>(() => existing ? toEstablishmentFormInput(existing) : initialValues)
  const [errors, setErrors] = useState<EstablishmentValidationErrors>({})
  const [feedback, setFeedback] = useState('')
  const [intent, setIntent] = useState<SubmissionIntent>('draft')
  const title = mode === 'create' ? 'Register Establishment' : 'Edit Establishment'
  const setField = (key: keyof EstablishmentFormInput, value: string) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    setFeedback('')
  }
  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setFeedback('')
    const result = mode === 'create'
      ? createEstablishment(values, intent === 'submit')
      : updateEstablishment(recordId ?? '', values)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    if (mode === 'edit' && intent === 'submit') {
      const workflowResult = submitEstablishment(result.establishment.id)
      if (!workflowResult.ok) {
        setFeedback(workflowResult.error)
        return
      }
    }
    setErrors({})
    setFeedback(intent === 'submit' ? 'Establishment submitted for review.' : 'Draft saved.')
  }
  const fieldClass = (hasError: boolean) => `mt-2 w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 ${hasError ? 'border-rose-600 bg-rose-50' : 'border-slate-300 bg-white'} focus:border-teal-700`
  const errorId = (field: keyof EstablishmentFormInput) => `${field}-error`

  if (mode === 'edit' && !existing) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-center"><h1 className="text-3xl font-black text-navy-950">Establishment not found</h1><p className="mt-3 text-slate-600">This record is unavailable in the registry.</p><Link to="/staff/dashboard" className="mt-6 inline-flex rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-bold text-white">Back to Staff Dashboard</Link></div>
  }

  return <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6"><Link to="/staff/dashboard" className="text-sm font-bold text-teal-700 hover:text-teal-600">← Back to Staff Dashboard</Link><div className="mt-6"><p className="text-sm font-black tracking-[0.16em] text-teal-700 uppercase">Staff workspace</p><h1 className="mt-2 text-3xl font-black tracking-tight text-navy-950 sm:text-4xl">{title}</h1><p className="mt-3 leading-7 text-slate-600">Provide the six establishment information fields before saving a draft or submitting the record for review.</p></div>{feedback && <div className="mt-6 rounded-xl border border-teal-700/20 bg-teal-100 p-4 text-sm text-teal-700" role="status">{feedback}</div>}
    <form noValidate onSubmit={onSubmit} className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="grid gap-6 sm:grid-cols-2">
      <div className="sm:col-span-2"><label className="text-sm font-bold text-slate-700" htmlFor="record-name">Name <span className="text-rose-700">*</span></label><input id="record-name" value={values.name} onChange={(event) => setField('name', event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? errorId('name') : undefined} className={fieldClass(Boolean(errors.name))} placeholder="Establishment name" />{errors.name && <p id={errorId('name')} className="mt-1 text-sm text-rose-700">{errors.name}</p>}</div>
      <div><label className="text-sm font-bold text-slate-700" htmlFor="record-website">Website URL</label><input id="record-website" type="url" value={values.website} onChange={(event) => setField('website', event.target.value)} aria-invalid={Boolean(errors.website)} aria-describedby={errors.website ? errorId('website') : undefined} className={fieldClass(Boolean(errors.website))} placeholder="https://example.test" />{errors.website && <p id={errorId('website')} className="mt-1 text-sm text-rose-700">{errors.website}</p>}</div>
      <div><label className="text-sm font-bold text-slate-700" htmlFor="record-category">Category <span className="text-rose-700">*</span></label><select id="record-category" value={values.categoryId} onChange={(event) => setField('categoryId', event.target.value)} aria-invalid={Boolean(errors.categoryId)} aria-describedby={errors.categoryId ? errorId('categoryId') : undefined} className={fieldClass(Boolean(errors.categoryId))}><option value="">Select a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name} — {category.description}</option>)}</select>{errors.categoryId && <p id={errorId('categoryId')} className="mt-1 text-sm text-rose-700">{errors.categoryId}</p>}</div>
      <div><label className="text-sm font-bold text-slate-700" htmlFor="record-email">Email</label><input id="record-email" type="email" value={values.email} onChange={(event) => setField('email', event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? errorId('email') : undefined} className={fieldClass(Boolean(errors.email))} placeholder="name@example.test" />{errors.email && <p id={errorId('email')} className="mt-1 text-sm text-rose-700">{errors.email}</p>}</div>
      <div><label className="text-sm font-bold text-slate-700" htmlFor="record-contact-number">Contact Number</label><input id="record-contact-number" type="tel" value={values.contactNumber} onChange={(event) => setField('contactNumber', event.target.value)} aria-invalid={Boolean(errors.contactNumber)} aria-describedby={errors.contactNumber ? errorId('contactNumber') : undefined} className={fieldClass(Boolean(errors.contactNumber))} placeholder="+000 000 0000" />{errors.contactNumber && <p id={errorId('contactNumber')} className="mt-1 text-sm text-rose-700">{errors.contactNumber}</p>}</div>
      <div className="sm:col-span-2"><label className="text-sm font-bold text-slate-700" htmlFor="record-summary">Brief Description <span className="text-rose-700">*</span></label><textarea id="record-summary" rows={6} value={values.summary} onChange={(event) => setField('summary', event.target.value)} aria-invalid={Boolean(errors.summary)} aria-describedby={errors.summary ? errorId('summary') : undefined} className={fieldClass(Boolean(errors.summary))} placeholder="Describe this establishment…" />{errors.summary && <p id={errorId('summary')} className="mt-1 text-sm text-rose-700">{errors.summary}</p>}</div>
    </div><div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-6"><button type="button" onClick={() => navigate('/staff/dashboard')} className="rounded-lg px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100">Cancel</button><button type="submit" onClick={() => setIntent('draft')} className="rounded-lg border border-navy-900 px-5 py-2.5 text-sm font-bold text-navy-900 hover:bg-navy-950 hover:text-white">Save draft</button><button type="submit" onClick={() => setIntent('submit')} className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-600">Submit for review</button></div></form>
  </div>
}

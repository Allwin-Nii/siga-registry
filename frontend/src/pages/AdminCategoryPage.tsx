import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { AdministratorApiError, createAdministratorCategory, deleteAdministratorCategory, listAdministratorCategories, updateAdministratorCategory, type AdministratorCategory, type AdministratorCategoryInput } from '../api/adminApi'
import { usePublicApiResource } from '../api/usePublicApiResource'
import { useAdminAuth } from '../state/useAdminAuth'

const emptyValues: AdministratorCategoryInput = { code: '', name: '', description: '' }

export function AdminCategoryPage() {
  const { csrfToken, clearExpiredSession } = useAdminAuth()
  const categories = usePublicApiResource(useCallback((signal: AbortSignal) => listAdministratorCategories({ signal }), []))
  const [values, setValues] = useState<AdministratorCategoryInput>(emptyValues)
  const [editing, setEditing] = useState<AdministratorCategory | undefined>()
  const [deleting, setDeleting] = useState<AdministratorCategory | undefined>()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [operationError, setOperationError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (categories.error instanceof AdministratorApiError && categories.error.status === 401) clearExpiredSession()
  }, [categories.error, clearExpiredSession])

  const resetForm = () => {
    setEditing(undefined)
    setValues(emptyValues)
    setFieldErrors({})
  }

  const setField = (field: keyof AdministratorCategoryInput, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: '' }))
    setOperationError('')
    setMessage('')
  }

  const handleError = (error: unknown) => {
    if (error instanceof AdministratorApiError && error.status === 401) clearExpiredSession()
    if (error instanceof AdministratorApiError && error.details) setFieldErrors(error.details)
    setOperationError(error instanceof Error ? error.message : 'The category operation could not be completed.')
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setFieldErrors({})
    setOperationError('')
    setMessage('')
    try {
      if (editing) {
        await updateAdministratorCategory(editing.id, values, csrfToken ?? '')
        setMessage('Category changes saved.')
      } else {
        await createAdministratorCategory(values, csrfToken ?? '')
        setMessage('Category created.')
      }
      resetForm()
      categories.retry()
    } catch (error) {
      handleError(error)
    } finally {
      setSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setOperationError('')
    setMessage('')
    try {
      await deleteAdministratorCategory(deleting.id, csrfToken ?? '')
      setDeleting(undefined)
      setMessage('Category deleted.')
      categories.retry()
    } catch (error) {
      handleError(error)
    }
  }

  const fieldClass = (field: keyof AdministratorCategoryInput) => `mt-2 w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 ${fieldErrors[field] ? 'border-rose-600 bg-rose-50' : 'border-slate-300 bg-white'} focus:border-teal-700`

  return <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><div><p className="text-sm font-black tracking-[0.16em] text-teal-700 uppercase">Administrator workspace</p><h1 className="mt-2 text-3xl font-black tracking-tight text-navy-950 sm:text-4xl">Categories</h1><p className="mt-3 max-w-2xl leading-7 text-slate-600">Maintain the category definitions available to entity records. Categories assigned to records cannot be deleted.</p></div>
    {message && <p className="mt-6 rounded-xl border border-teal-700/20 bg-teal-100 p-4 text-sm text-teal-800" role="status">{message}</p>}
    {operationError && <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{operationError}</p>}
    {deleting && <section className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5" role="alertdialog" aria-labelledby="delete-category-title"><h2 id="delete-category-title" className="font-black text-navy-950">Delete {deleting.code}?</h2><p className="mt-2 text-sm leading-6 text-slate-700">This deletes the category definition only. Categories used by entities are protected and the API will reject the deletion.</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={() => void confirmDelete()} className="rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-bold text-white">Confirm delete</button><button type="button" onClick={() => setDeleting(undefined)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">Cancel</button></div></section>}
    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]"><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">{categories.loading && <div className="p-8" role="status">Loading categories…</div>}{categories.error && <div className="p-8" role="alert"><p className="font-bold text-navy-950">Unable to load categories</p><p className="mt-2 text-sm text-slate-600">{categories.error.message}</p><button type="button" onClick={categories.retry} className="mt-4 font-bold text-teal-700">Retry</button></div>}{categories.data && <div className="overflow-x-auto"><table className="w-full min-w-150 text-left text-sm"><caption className="sr-only">Administrator categories</caption><thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase"><tr><th className="px-6 py-3 font-bold">Code</th><th className="px-6 py-3 font-bold">Name</th><th className="px-6 py-3 font-bold">Description</th><th className="px-6 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-slate-100">{categories.data.map((category) => <tr key={category.id}><td className="px-6 py-4 font-bold text-navy-950">{category.code}</td><td className="px-6 py-4 text-slate-700">{category.name}</td><td className="px-6 py-4 text-slate-600">{category.description}</td><td className="px-6 py-4"><div className="flex justify-end gap-3"><button type="button" onClick={() => { setEditing(category); setValues({ code: category.code, name: category.name, description: category.description }); setFieldErrors({}); setMessage(''); setOperationError('') }} className="font-bold text-teal-700" aria-label={`Edit ${category.code}`}>Edit<span className="sr-only"> {category.code}</span></button><button type="button" onClick={() => setDeleting(category)} className="font-bold text-rose-700" aria-label={`Delete ${category.code}`}>Delete<span className="sr-only"> {category.code}</span></button></div></td></tr>)}</tbody></table></div>}</section>
      <section className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black text-navy-950">{editing ? `Edit ${editing.code}` : 'Add category'}</h2><form noValidate onSubmit={(event) => void submit(event)} className="mt-5 space-y-5"><div><label className="text-sm font-bold text-slate-700" htmlFor="category-code">Code <span className="text-rose-700">*</span></label><input id="category-code" value={values.code} onChange={(event) => setField('code', event.target.value)} aria-invalid={Boolean(fieldErrors.code)} className={fieldClass('code')} maxLength={3} />{fieldErrors.code && <p className="mt-1 text-sm text-rose-700">{fieldErrors.code}</p>}</div><div><label className="text-sm font-bold text-slate-700" htmlFor="category-name">Name <span className="text-rose-700">*</span></label><input id="category-name" value={values.name} onChange={(event) => setField('name', event.target.value)} aria-invalid={Boolean(fieldErrors.name)} className={fieldClass('name')} />{fieldErrors.name && <p className="mt-1 text-sm text-rose-700">{fieldErrors.name}</p>}</div><div><label className="text-sm font-bold text-slate-700" htmlFor="category-description">Description <span className="text-rose-700">*</span></label><textarea id="category-description" rows={4} value={values.description} onChange={(event) => setField('description', event.target.value)} aria-invalid={Boolean(fieldErrors.description)} className={fieldClass('description')} />{fieldErrors.description && <p className="mt-1 text-sm text-rose-700">{fieldErrors.description}</p>}</div><div className="flex flex-wrap justify-end gap-3"><button type="button" onClick={resetForm} className="rounded-lg px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100">Cancel</button><button type="submit" disabled={submitting} className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{submitting ? 'Saving…' : editing ? 'Save category' : 'Create category'}</button></div></form></section>
    </div>
  </div>
}

import { type ChangeEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AdministratorApiError,
  confirmAdministratorBulkImport,
  downloadAdministratorImportErrorReport,
  downloadAdministratorImportTemplate,
  previewAdministratorBulkImport,
  type AdministratorBulkImportPreview,
  type AdministratorBulkImportSummary,
} from '../api/adminApi'
import { useAdminAuth } from '../state/useAdminAuth'

const supportedColumns = [
  'Entity Name', 'Category', 'Website URL', 'Email Address', 'Contact Number',
]
const maximumFileBytes = 5 * 1024 * 1024

const saveDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const previewStatusClass = (status: AdministratorBulkImportPreview['rows'][number]['status']) => {
  if (status === 'valid') return 'bg-teal-100 text-teal-800'
  if (status === 'duplicate') return 'bg-amber-100 text-amber-800'
  return 'bg-rose-100 text-rose-800'
}

export function AdminBulkImportPage() {
  const { csrfToken, clearExpiredSession } = useAdminAuth()
  const [file, setFile] = useState<File>()
  const [preview, setPreview] = useState<AdministratorBulkImportPreview>()
  const [summary, setSummary] = useState<AdministratorBulkImportSummary>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<'template' | 'preview' | 'report' | 'confirm' | undefined>()
  const [confirming, setConfirming] = useState(false)

  const handleError = (reason: unknown, fallback: string) => {
    if (reason instanceof AdministratorApiError && reason.status === 401) clearExpiredSession()
    setError(reason instanceof Error ? reason.message : fallback)
  }

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    setError('')
    setPreview(undefined)
    setSummary(undefined)
    setConfirming(false)
    if (!selected) {
      setFile(undefined)
      return
    }
    const extension = selected.name.toLocaleLowerCase().split('.').at(-1)
    if ((extension !== 'xlsx' && extension !== 'csv') || selected.size > maximumFileBytes) {
      setFile(undefined)
      setError('Choose a valid .xlsx or .csv file no larger than 5 MB.')
      event.target.value = ''
      return
    }
    setFile(selected)
  }

  const downloadTemplate = async () => {
    setError('')
    setBusy('template')
    try {
      saveDownload(await downloadAdministratorImportTemplate(), 'siga-registry-entity-import-template.xlsx')
    } catch (reason) {
      handleError(reason, 'The Excel template could not be downloaded.')
    } finally {
      setBusy(undefined)
    }
  }

  const createPreview = async () => {
    if (!file) {
      setError('Choose an Excel or CSV file before previewing the import.')
      return
    }
    setError('')
    setBusy('preview')
    try {
      setPreview(await previewAdministratorBulkImport(file, csrfToken ?? ''))
    } catch (reason) {
      handleError(reason, 'The import file could not be previewed.')
    } finally {
      setBusy(undefined)
    }
  }

  const downloadErrors = async () => {
    if (!preview) return
    setError('')
    setBusy('report')
    try {
      saveDownload(await downloadAdministratorImportErrorReport(preview.id), 'siga-registry-import-errors.csv')
    } catch (reason) {
      handleError(reason, 'The import error report could not be downloaded.')
    } finally {
      setBusy(undefined)
    }
  }

  const confirmImport = async () => {
    if (!preview) return
    setError('')
    setBusy('confirm')
    try {
      setSummary(await confirmAdministratorBulkImport(preview.id, csrfToken ?? ''))
      setConfirming(false)
    } catch (reason) {
      handleError(reason, 'The valid entity records could not be imported.')
    } finally {
      setBusy(undefined)
    }
  }

  const reset = () => {
    setFile(undefined)
    setPreview(undefined)
    setSummary(undefined)
    setError('')
    setConfirming(false)
  }

  return <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
    <Link to="/admin/establishments" className="text-sm font-bold text-teal-700 hover:text-teal-600">← Back to Entities</Link>
    <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-black tracking-[0.16em] text-teal-700 uppercase">Administrator workspace</p><h1 className="mt-2 text-3xl font-black tracking-tight text-navy-950 sm:text-4xl">Bulk Entity Import</h1></div><button type="button" onClick={() => void downloadTemplate()} disabled={Boolean(busy)} className="inline-flex w-fit rounded-lg border border-navy-950 px-5 py-3 text-sm font-bold text-navy-950 hover:bg-navy-950 hover:text-white disabled:opacity-60">{busy === 'template' ? 'Preparing template…' : 'Download Excel Template'}</button></div>
    {error && <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{error}</p>}
    {!summary && <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="import-file-heading"><h2 id="import-file-heading" className="text-xl font-black text-navy-950">Upload spreadsheet</h2><label className="mt-4 block text-sm font-bold text-slate-700" htmlFor="bulk-import-file">Entity spreadsheet</label><input id="bulk-import-file" type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" onChange={selectFile} className="mt-2 block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-sm file:font-bold file:text-teal-800 hover:file:bg-teal-100" />{file && <p className="mt-3 text-sm text-slate-600">Selected: <span className="font-bold text-navy-950">{file.name}</span></p>}<div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={() => void createPreview()} disabled={busy === 'preview'} className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-600 disabled:opacity-60">{busy === 'preview' ? 'Validating…' : 'Preview Import'}</button>{preview && <button type="button" onClick={reset} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Upload corrected file</button>}</div></section>}
    {preview && !summary && <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="import-preview-heading"><div className="border-b border-slate-200 p-6 sm:flex sm:items-start sm:justify-between sm:gap-6"><div><h2 id="import-preview-heading" className="text-xl font-black text-navy-950">Import preview</h2><p className="mt-2 text-sm leading-6 text-slate-600">No records have been created. This preview expires at {new Date(preview.expiresAt).toLocaleTimeString()}.</p></div><div className="mt-4 flex flex-wrap gap-2 sm:mt-0"><span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700">{preview.total} total</span><span className="rounded-full bg-teal-100 px-3 py-1.5 text-sm font-bold text-teal-800">{preview.valid} valid</span><span className="rounded-full bg-rose-100 px-3 py-1.5 text-sm font-bold text-rose-800">{preview.invalid} invalid</span><span className="rounded-full bg-amber-100 px-3 py-1.5 text-sm font-bold text-amber-800">{preview.duplicates} duplicates</span></div></div><div className="max-h-145 overflow-auto"><table className="w-full min-w-700 text-left text-xs"><caption className="sr-only">Bulk import records and validation results</caption><thead className="sticky top-0 bg-slate-50 text-slate-500"><tr><th className="px-4 py-3 font-bold">Row</th><th className="px-4 py-3 font-bold">Status</th>{supportedColumns.map((column) => <th key={column} className="px-4 py-3 font-bold whitespace-nowrap">{column}</th>)}<th className="px-4 py-3 font-bold">Validation messages</th></tr></thead><tbody className="divide-y divide-slate-100">{preview.rows.map((row) => <tr key={row.rowNumber} className="align-top hover:bg-slate-50"><td className="px-4 py-3 font-semibold text-slate-600">{row.rowNumber}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 font-bold capitalize ${previewStatusClass(row.status)}`}>{row.status}</span></td>{supportedColumns.map((column) => <td key={column} className="max-w-52 px-4 py-3 break-words text-slate-700">{row.values[column] || '—'}</td>)}<td className="max-w-80 px-4 py-3 text-rose-700">{Object.entries(row.errors).map(([field, message]) => <p key={field}><span className="font-bold">{field}:</span> {message}</p>)}</td></tr>)}</tbody></table></div><div className="flex flex-wrap justify-between gap-3 border-t border-slate-200 p-6"><div className="flex flex-wrap gap-3"><button type="button" onClick={reset} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Upload corrected file</button>{preview.invalid + preview.duplicates > 0 && <button type="button" onClick={() => void downloadErrors()} disabled={Boolean(busy)} className="rounded-lg border border-navy-950 px-4 py-2.5 text-sm font-bold text-navy-950 hover:bg-navy-950 hover:text-white disabled:opacity-60">{busy === 'report' ? 'Preparing report…' : 'Download error report'}</button>}</div>{preview.valid > 0 && <button type="button" onClick={() => setConfirming(true)} disabled={Boolean(busy)} className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-600 disabled:opacity-60">Import Valid Entities</button>}</div></section>}
    {confirming && preview && <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6" role="alertdialog" aria-labelledby="confirm-import-heading"><h2 id="confirm-import-heading" className="text-xl font-black text-navy-950">Confirm bulk import</h2><p className="mt-2 text-sm leading-6 text-slate-700">Import {preview.valid} valid entity {preview.valid === 1 ? 'record' : 'records'} as drafts? {preview.invalid} invalid and {preview.duplicates} duplicate records will be skipped.</p><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => void confirmImport()} disabled={busy === 'confirm'} className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-600 disabled:opacity-60">{busy === 'confirm' ? 'Importing…' : `Confirm import ${preview.valid} valid entities`}</button><button type="button" onClick={() => setConfirming(false)} disabled={busy === 'confirm'} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-white">Cancel</button></div></section>}
    {summary && <section className="mt-8 rounded-2xl border border-teal-700/20 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="import-summary-heading"><h2 id="import-summary-heading" className="text-2xl font-black text-navy-950">Import summary</h2><p className="mt-2 text-sm leading-6 text-slate-600">Each imported record is a draft and can be completed, given images and members, and published from entity management.</p><div className="mt-6 grid gap-4 sm:grid-cols-3"><div className="rounded-xl bg-teal-100 p-4"><p className="text-sm font-bold text-teal-800">Imported</p><p className="mt-1 text-3xl font-black text-teal-900">{summary.imported.length}</p></div><div className="rounded-xl bg-amber-100 p-4"><p className="text-sm font-bold text-amber-800">Skipped duplicates</p><p className="mt-1 text-3xl font-black text-amber-900">{summary.skippedDuplicates.length}</p></div><div className="rounded-xl bg-rose-100 p-4"><p className="text-sm font-bold text-rose-800">Rejected</p><p className="mt-1 text-3xl font-black text-rose-900">{summary.rejected.length}</p></div></div>{summary.imported.length > 0 && <ul className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200"><li className="bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">Imported entities</li>{summary.imported.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"><span>{item.name}</span><Link to={`/admin/establishments/${item.id}/edit`} className="font-bold text-teal-700 hover:text-teal-600">Manage entity</Link></li>)}</ul>}<Link to="/admin/establishments" className="mt-6 inline-flex rounded-lg bg-navy-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-navy-900">Back to Entities</Link></section>}
  </div>
}

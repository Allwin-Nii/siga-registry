import type { RecordStatus } from '../types'

const statusClasses: Record<RecordStatus, string> = {
  Draft: 'bg-slate-100 text-slate-700 ring-slate-200',
  'Pending review': 'bg-amber-50 text-amber-800 ring-amber-200',
  Published: 'bg-teal-100 text-teal-700 ring-teal-200',
  'Changes requested': 'bg-rose-50 text-rose-800 ring-rose-200',
  Rejected: 'bg-rose-100 text-rose-900 ring-rose-200',
}

export function Badge({ status }: { status: RecordStatus }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${statusClasses[status]}`}>{status}</span>
}

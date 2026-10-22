import type { AdministratorWorkflowStatus } from '../api/adminApi'

const labels: Record<AdministratorWorkflowStatus, string> = {
  draft: 'Unpublished',
  pending_review: 'Pending review',
  published: 'Published',
  changes_requested: 'Changes requested',
  rejected: 'Rejected',
}

const classes: Record<AdministratorWorkflowStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 ring-slate-200',
  pending_review: 'bg-amber-50 text-amber-800 ring-amber-200',
  published: 'bg-teal-100 text-teal-700 ring-teal-200',
  changes_requested: 'bg-rose-50 text-rose-800 ring-rose-200',
  rejected: 'bg-rose-100 text-rose-900 ring-rose-200',
}

export function AdministratorStatusBadge({ status }: { status: AdministratorWorkflowStatus }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${classes[status]}`}>{labels[status]}</span>
}

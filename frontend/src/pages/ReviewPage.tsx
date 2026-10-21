import { useState } from 'react'
import { Badge } from '../components/Badge'
import { categoryLabel } from '../data/mockData'
import { useRegistry } from '../state/useRegistry'
import type { Establishment, ReviewDecision } from '../types'

type PendingReviewCardProps = {
  establishment: Establishment
  onReview: (id: string, decision: ReviewDecision, feedback: string) => void
  error?: string
}

function PendingReviewCard({ establishment, onReview, error }: PendingReviewCardProps) {
  const [feedback, setFeedback] = useState('')
  const decide = (decision: ReviewDecision) => onReview(establishment.id, decision, feedback)
  return <article className="rounded-2xl border border-slate-200 bg-white shadow-sm"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-6"><div><div className="flex items-center gap-3"><h2 className="text-xl font-black text-navy-950">{establishment.name}</h2><Badge status={establishment.status} /></div><p className="mt-2 text-sm text-slate-500">Submission REF-{establishment.id.toUpperCase()} · submitted by {establishment.owner ?? 'Registry staff'}</p></div><span className="text-sm text-slate-500">{establishment.lastUpdated}</span></header>
    <div className="grid gap-7 p-6 lg:grid-cols-[1fr_18rem]"><dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="font-bold text-slate-500">Name</dt><dd className="mt-1 text-slate-700">{establishment.name}</dd></div><div><dt className="font-bold text-slate-500">Category</dt><dd className="mt-1 text-slate-700">{categoryLabel(establishment.categoryId)}</dd></div><div className="sm:col-span-2"><dt className="font-bold text-slate-500">Brief Description</dt><dd className="mt-1 leading-6 text-slate-700">{establishment.summary}</dd></div><div><dt className="font-bold text-slate-500">Website URL</dt><dd className="mt-1 break-words text-slate-700">{establishment.website || 'Not provided'}</dd></div><div><dt className="font-bold text-slate-500">Email</dt><dd className="mt-1 break-words text-slate-700">{establishment.email || 'Not provided'}</dd></div><div><dt className="font-bold text-slate-500">Contact Number</dt><dd className="mt-1 text-slate-700">{establishment.contactNumber || 'Not provided'}</dd></div></dl>
      <section className="rounded-xl bg-slate-50 p-4"><h3 className="font-black text-navy-950">Review Submission</h3><p className="mt-2 text-sm leading-6 text-slate-600">Feedback is required for changes requested and rejection.</p><label className="mt-4 block text-sm font-bold text-slate-700" htmlFor={`review-feedback-${establishment.id}`}>Feedback</label><textarea id={`review-feedback-${establishment.id}`} value={feedback} onChange={(event) => setFeedback(event.target.value)} rows={4} className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-teal-700" placeholder="Explain the requested change or rejection." />{error && <p className="mt-2 text-sm text-rose-700" role="alert">{error}</p>}<div className="mt-4 space-y-2"><button onClick={() => decide('approve')} className="w-full rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-600">Approve</button><button onClick={() => decide('request_changes')} className="w-full rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800 hover:bg-amber-100">Request changes</button><button onClick={() => decide('reject')} className="w-full rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-800 hover:bg-rose-100">Reject</button></div></section>
    </div>
  </article>
}

export function ReviewPage() {
  const { establishments, reviewEstablishment } = useRegistry()
  const [feedbackByRecord, setFeedbackByRecord] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const pendingEstablishments = establishments.filter((record) => record.status === 'Pending review')
  const review = (id: string, decision: ReviewDecision, feedback: string) => {
    const result = reviewEstablishment(id, decision, feedback)
    if (!result.ok) {
      setFeedbackByRecord((current) => ({ ...current, [id]: result.error }))
      return
    }
    setFeedbackByRecord((current) => ({ ...current, [id]: '' }))
    setMessage(decision === 'approve' ? 'Establishment approved and published in the public directory.' : decision === 'request_changes' ? 'Changes requested from the submitting staff member.' : 'Establishment rejected.')
  }

  return <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><div className="max-w-3xl"><p className="text-sm font-black tracking-[0.16em] text-teal-700 uppercase">Administrator review</p><h1 className="mt-2 text-3xl font-black tracking-tight text-navy-950 sm:text-4xl">Pending Reviews</h1><p className="mt-3 leading-7 text-slate-600">Review submitted establishment records, provide feedback where needed, and update their publication status.</p></div>{message && <div className="mt-6 rounded-xl border border-teal-700/20 bg-teal-100 p-4 text-sm text-teal-700" role="status">{message}</div>}<section className="mt-8 space-y-6" aria-live="polite">{pendingEstablishments.length ? pendingEstablishments.map((establishment) => <PendingReviewCard key={establishment.id} establishment={establishment} onReview={review} error={feedbackByRecord[establishment.id]} />) : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="font-black text-navy-950">No pending submissions</h2><p className="mt-2 text-sm leading-6 text-slate-600">Submitted establishment records will appear here for review.</p></div>}</section></div>
}

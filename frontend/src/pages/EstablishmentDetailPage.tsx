import { Link, useParams } from 'react-router-dom'
import { categoryLabel } from '../data/mockData'
import { useRegistry } from '../state/useRegistry'

const NotProvided = () => <span className="text-slate-500">Not provided</span>

export function EstablishmentDetailPage() {
  const { slug } = useParams()
  const { findEstablishmentBySlug } = useRegistry()
  const establishment = slug ? findEstablishmentBySlug(slug) : undefined

  if (!establishment || establishment.status !== 'Published') {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-center"><h1 className="text-3xl font-black text-navy-950">Establishment not found</h1><p className="mt-3 text-slate-600">That profile is unavailable in the public directory.</p><Link to="/directory" className="mt-6 inline-flex rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-bold text-white">Back to Establishments</Link></div>
  }

  const telephoneHref = `tel:${establishment.contactNumber.replace(/[^+\d]/g, '')}`

  return <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
    <Link to="/directory" className="text-sm font-bold text-teal-700 hover:text-teal-600">← Back to Establishments</Link>
    <article className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 bg-linear-to-r from-navy-950 to-navy-800 px-6 py-8 text-white sm:px-8">
        <p className="text-sm font-black tracking-[0.16em] text-teal-100 uppercase">Selected establishment profile</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{establishment.name}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Contact details are provided where available. Please confirm current information with the establishment directly.</p>
      </header>
      <dl className="divide-y divide-slate-200 px-6 sm:px-8">
        <div className="grid gap-2 py-5 sm:grid-cols-[11rem_1fr]"><dt className="text-sm font-bold text-slate-500">Name</dt><dd className="text-lg font-black text-navy-950">{establishment.name}</dd></div>
        <div className="grid gap-2 py-5 sm:grid-cols-[11rem_1fr]"><dt className="text-sm font-bold text-slate-500">Website URL</dt><dd className="break-words">{establishment.website ? <a href={establishment.website} target="_blank" rel="noopener noreferrer" className="font-bold text-teal-700 hover:text-teal-600">{establishment.website}</a> : <NotProvided />}</dd></div>
        <div className="grid gap-2 py-5 sm:grid-cols-[11rem_1fr]"><dt className="text-sm font-bold text-slate-500">Category</dt><dd className="text-slate-700">{categoryLabel(establishment.categoryId)}</dd></div>
        <div className="grid gap-2 py-5 sm:grid-cols-[11rem_1fr]"><dt className="text-sm font-bold text-slate-500">Email Address</dt><dd className="break-words">{establishment.email ? <a href={`mailto:${establishment.email}`} className="font-bold text-teal-700 hover:text-teal-600">{establishment.email}</a> : <NotProvided />}</dd></div>
        <div className="grid gap-2 py-5 sm:grid-cols-[11rem_1fr]"><dt className="text-sm font-bold text-slate-500">Contact Number</dt><dd>{establishment.contactNumber ? <a href={telephoneHref} className="font-bold text-teal-700 hover:text-teal-600">{establishment.contactNumber}</a> : <NotProvided />}</dd></div>
        <div className="grid gap-2 py-5 sm:grid-cols-[11rem_1fr]"><dt className="text-sm font-bold text-slate-500">Brief Description</dt><dd className="leading-7 text-slate-700">{establishment.summary}</dd></div>
      </dl>
    </article>
  </div>
}

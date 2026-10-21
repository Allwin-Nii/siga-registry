import { Link, useParams } from 'react-router-dom'
import { categoryLabel } from '../data/mockData'
import { useRegistry } from '../state/useRegistry'

const NotProvided = () => <span className="text-slate-500">Not provided</span>

export function EstablishmentDetailPage() {
  const { slug } = useParams()
  const { findEstablishmentBySlug } = useRegistry()
  const establishment = slug ? findEstablishmentBySlug(slug) : undefined

  if (!establishment || establishment.status !== 'Published') {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-center"><h1 className="text-3xl font-black text-navy-950">Establishment not found</h1><p className="mt-3 text-slate-600">That profile is unavailable in the public prototype directory.</p><Link to="/directory" className="mt-6 inline-flex rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-bold text-white">Back to Directory</Link></div>
  }

  return <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
    <Link to="/directory" className="text-sm font-bold text-teal-700 hover:text-teal-600">← Back to Directory</Link>
    <article className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-black tracking-[0.16em] text-teal-700 uppercase">Fictional establishment profile</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-navy-950 sm:text-4xl">Establishment details</h1>
      <dl className="mt-8 divide-y divide-slate-200">
        <div className="py-5 first:pt-0"><dt className="text-sm font-bold text-slate-500">Establishment Name</dt><dd className="mt-1 text-xl font-black text-navy-950">{establishment.name}</dd></div>
        <div className="py-5"><dt className="text-sm font-bold text-slate-500">Category</dt><dd className="mt-1 text-slate-700">{categoryLabel(establishment.categoryId)}</dd></div>
        <div className="py-5"><dt className="text-sm font-bold text-slate-500">Brief Description</dt><dd className="mt-1 leading-7 text-slate-700">{establishment.summary}</dd></div>
        <div className="py-5"><dt className="text-sm font-bold text-slate-500">Website URL</dt><dd className="mt-1 break-words">{establishment.website ? <a href={establishment.website} target="_blank" rel="noopener noreferrer" className="font-bold text-teal-700 hover:text-teal-600">{establishment.website}</a> : <NotProvided />}</dd></div>
        <div className="py-5"><dt className="text-sm font-bold text-slate-500">Email Address</dt><dd className="mt-1 break-words">{establishment.email ? <a href={`mailto:${establishment.email}`} className="font-bold text-teal-700 hover:text-teal-600">{establishment.email}</a> : <NotProvided />}</dd></div>
        <div className="py-5 pb-0"><dt className="text-sm font-bold text-slate-500">Contact Number</dt><dd className="mt-1">{establishment.contactNumber ? <a href={`tel:${establishment.contactNumber}`} className="font-bold text-teal-700 hover:text-teal-600">{establishment.contactNumber}</a> : <NotProvided />}</dd></div>
      </dl>
    </article>
  </div>
}

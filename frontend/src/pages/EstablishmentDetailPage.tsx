import { useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPublicEstablishment, PublicApiError, type PublicEstablishment } from '../api/publicApi'
import { usePublicApiResource } from '../api/usePublicApiResource'

const NotProvided = () => <span className="text-slate-500">Not provided</span>

export function EstablishmentDetailPage() {
  const { slug } = useParams()
  const normalizedSlug = slug?.trim()
  const establishment = usePublicApiResource(useCallback(
    (signal: AbortSignal): Promise<PublicEstablishment | undefined> => normalizedSlug
      ? getPublicEstablishment(normalizedSlug, { signal })
      : Promise.resolve(undefined),
    [normalizedSlug],
  ))

  if (establishment.loading) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-center" role="status"><h1 className="text-3xl font-black text-navy-950">Loading entity profile…</h1><p className="mt-3 text-slate-600">Retrieving the published profile.</p></div>
  }

  if (establishment.error instanceof PublicApiError && establishment.error.status === 404) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-center"><h1 className="text-3xl font-black text-navy-950">Entity not found</h1><p className="mt-3 text-slate-600">That profile is unavailable in the public directory.</p><Link to="/directory" className="mt-6 inline-flex rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-bold text-white">Back to Entities</Link></div>
  }

  if (establishment.error) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-center" role="alert"><h1 className="text-3xl font-black text-navy-950">This profile is unavailable right now</h1><p className="mt-3 text-slate-600">{establishment.error.message}</p><button type="button" onClick={establishment.retry} className="mt-6 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-bold text-white">Retry</button><Link to="/directory" className="mt-6 ml-3 inline-flex rounded-lg border border-navy-950 px-4 py-2.5 text-sm font-bold text-navy-950">Back to Entities</Link></div>
  }

  if (!establishment.data) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-center"><h1 className="text-3xl font-black text-navy-950">Entity not found</h1><p className="mt-3 text-slate-600">That profile is unavailable in the public directory.</p><Link to="/directory" className="mt-6 inline-flex rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-bold text-white">Back to Entities</Link></div>
  }

  const profile = establishment.data

  const telephoneHref = `tel:${profile.contactNumber.replace(/[^+\d]/g, '')}`

  return <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
    <Link to="/directory" className="text-sm font-bold text-teal-700 hover:text-teal-600">← Back to Entities</Link>
    <article className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 bg-linear-to-r from-navy-950 to-navy-800 px-6 py-8 text-white sm:px-8">
        <p className="text-sm font-black tracking-[0.16em] text-teal-100 uppercase">Selected entity profile</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{profile.name}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Contact details are provided where available. Please confirm current information with the entity directly.</p>
      </header>
      <dl className="divide-y divide-slate-200 px-6 sm:px-8">
        <div className="grid gap-2 py-5 sm:grid-cols-[11rem_1fr]"><dt className="text-sm font-bold text-slate-500">Name</dt><dd className="text-lg font-black text-navy-950">{profile.name}</dd></div>
        <div className="grid gap-2 py-5 sm:grid-cols-[11rem_1fr]"><dt className="text-sm font-bold text-slate-500">Website URL</dt><dd className="break-words">{profile.website ? <a href={profile.website} target="_blank" rel="noopener noreferrer" className="font-bold text-teal-700 hover:text-teal-600">{profile.website}</a> : <NotProvided />}</dd></div>
        <div className="grid gap-2 py-5 sm:grid-cols-[11rem_1fr]"><dt className="text-sm font-bold text-slate-500">Category</dt><dd className="text-slate-700">{profile.category.code} — {profile.category.description}</dd></div>
        <div className="grid gap-2 py-5 sm:grid-cols-[11rem_1fr]"><dt className="text-sm font-bold text-slate-500">Email</dt><dd className="break-words">{profile.email ? <a href={`mailto:${profile.email}`} className="font-bold text-teal-700 hover:text-teal-600">{profile.email}</a> : <NotProvided />}</dd></div>
        <div className="grid gap-2 py-5 sm:grid-cols-[11rem_1fr]"><dt className="text-sm font-bold text-slate-500">Contact Number</dt><dd>{profile.contactNumber ? <a href={telephoneHref} className="font-bold text-teal-700 hover:text-teal-600">{profile.contactNumber}</a> : <NotProvided />}</dd></div>
        <div className="grid gap-2 py-5 sm:grid-cols-[11rem_1fr]"><dt className="text-sm font-bold text-slate-500">Brief Description</dt><dd className="leading-7 text-slate-700">{profile.summary}</dd></div>
      </dl>
    </article>
  </div>
}

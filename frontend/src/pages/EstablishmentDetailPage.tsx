import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPublicEstablishment, PublicApiError, type PublicEstablishment } from '../api/publicApi'
import { usePublicApiResource } from '../api/usePublicApiResource'

const NotProvided = () => <span className="text-slate-500">Not provided</span>

export function EstablishmentDetailPage() {
  const { slug } = useParams()
  const normalizedSlug = slug?.trim()
  const [failedLogoUrl, setFailedLogoUrl] = useState<string>()
  const [selectedManagementId, setSelectedManagementId] = useState<number | undefined>()
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
  const logoUnavailable = failedLogoUrl === profile.logoUrl
  const management = profile.management ?? []
  const selectedManagement = management.find((member) => member.id === selectedManagementId) ?? management[0]
  const hasCoordinates = profile.latitude !== null && profile.latitude !== undefined && profile.longitude !== null && profile.longitude !== undefined
  const mapUrl = hasCoordinates ? `https://www.google.com/maps?q=${encodeURIComponent(`${profile.latitude},${profile.longitude}`)}` : undefined

  return <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
    <Link to="/directory" className="text-sm font-bold text-teal-700 hover:text-teal-600">← Back to Entities</Link>
    <article className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-col gap-6 border-b border-slate-200 bg-linear-to-r from-navy-950 to-navy-800 px-6 py-8 text-white sm:flex-row sm:items-center sm:px-8">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-white p-3 shadow-sm">
          {profile.logoUrl && !logoUnavailable
            ? <img src={profile.logoUrl} alt={`${profile.name} logo`} onError={() => setFailedLogoUrl(profile.logoUrl)} className="max-h-full max-w-full object-contain" />
            : <span role="img" aria-label="No institution logo available" className="text-center text-xs font-black tracking-[0.12em] text-navy-950 uppercase">Institution<br />profile</span>}
        </div>
        <div><p className="text-sm font-black tracking-[0.16em] text-teal-100 uppercase">Specified entity profile</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{profile.name}</h1><p className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-teal-50">{profile.category.code} — {profile.category.description}</p></div>
      </header>
      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-2">
        <section className="lg:col-span-2"><h2 className="text-xl font-black text-navy-950">Institutional overview</h2><p className="mt-3 leading-7 text-slate-700">{profile.summary}</p></section>
        <section><h2 className="text-xl font-black text-navy-950">Location</h2><dl className="mt-4 space-y-3 text-sm"><div><dt className="font-bold text-slate-500">Region</dt><dd className="mt-1 text-slate-700">{profile.region || <NotProvided />}</dd></div><div><dt className="font-bold text-slate-500">City</dt><dd className="mt-1 text-slate-700">{profile.city || <NotProvided />}</dd></div><div><dt className="font-bold text-slate-500">Physical address</dt><dd className="mt-1 whitespace-pre-line text-slate-700">{profile.physicalAddress || <NotProvided />}</dd></div><div><dt className="font-bold text-slate-500">GhanaPost GPS address</dt><dd className="mt-1 text-slate-700">{profile.gpsAddress || <NotProvided />}</dd></div><div><dt className="font-bold text-slate-500">Coordinates</dt><dd className="mt-1 text-slate-700">{hasCoordinates ? <>{profile.latitude}, {profile.longitude} {mapUrl && <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="ml-2 font-bold text-teal-700 hover:text-teal-600">View on Map</a>}</> : <NotProvided />}</dd></div></dl></section>
        <section><h2 className="text-xl font-black text-navy-950">Contact information</h2><dl className="mt-4 space-y-3 text-sm"><div><dt className="font-bold text-slate-500">Official telephone</dt><dd className="mt-1">{profile.contactNumber ? <a href={telephoneHref} className="font-bold text-teal-700 hover:text-teal-600">{profile.contactNumber}</a> : <NotProvided />}</dd></div><div><dt className="font-bold text-slate-500">Official email</dt><dd className="mt-1 break-words">{profile.email ? <a href={`mailto:${profile.email}`} className="font-bold text-teal-700 hover:text-teal-600">{profile.email}</a> : <NotProvided />}</dd></div><div><dt className="font-bold text-slate-500">Official website</dt><dd className="mt-1 break-words">{profile.website ? <a href={profile.website} target="_blank" rel="noopener noreferrer" className="font-bold text-teal-700 hover:text-teal-600">{profile.website}</a> : <NotProvided />}</dd></div></dl></section>
        <section className="rounded-xl bg-slate-50 p-5 lg:col-span-2"><h2 className="text-xl font-black text-navy-950">Management and leadership</h2>{management.length === 0 ? <p className="mt-3 text-sm leading-6 text-slate-600">No management or leadership information has been provided.</p> : <><label className="mt-4 block text-sm font-bold text-slate-700" htmlFor="management-member">Select a member</label><select id="management-member" value={String(selectedManagement?.id ?? '')} onChange={(event) => setSelectedManagementId(Number(event.target.value))} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-teal-700"><option value="" disabled>Select a management member</option>{management.map((member) => <option key={member.id} value={member.id}>{member.fullName} — {member.position}</option>)}</select>{selectedManagement && <dl className="mt-5 grid gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2"><div><dt className="text-sm font-bold text-slate-500">Full name</dt><dd className="mt-1 font-black text-navy-950">{selectedManagement.fullName}</dd></div><div><dt className="text-sm font-bold text-slate-500">Official position</dt><dd className="mt-1 text-slate-700">{selectedManagement.position}</dd></div><div><dt className="text-sm font-bold text-slate-500">Official email</dt><dd className="mt-1 break-words text-slate-700">{selectedManagement.officialEmail ? <a href={`mailto:${selectedManagement.officialEmail}`} className="font-bold text-teal-700 hover:text-teal-600">{selectedManagement.officialEmail}</a> : <NotProvided />}</dd></div><div><dt className="text-sm font-bold text-slate-500">Official telephone</dt><dd className="mt-1 text-slate-700">{selectedManagement.officialPhone ? <a href={`tel:${selectedManagement.officialPhone.replace(/[^+\d]/g, '')}`} className="font-bold text-teal-700 hover:text-teal-600">{selectedManagement.officialPhone}</a> : <NotProvided />}</dd></div></dl>}</>}</section>
      </div>
    </article>
  </div>
}

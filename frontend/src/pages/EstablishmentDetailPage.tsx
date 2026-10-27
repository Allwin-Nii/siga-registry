import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPublicEstablishment, PublicApiError, type PublicEstablishment } from '../api/publicApi'
import { usePublicApiResource } from '../api/usePublicApiResource'

const NotProvided = () => <span className="text-slate-500">Not provided</span>

function InstitutionFallbackIcon() {
  return <svg role="img" aria-label="No institution logo available" viewBox="0 0 48 48" className="h-12 w-12 text-navy-950" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 19 24 8l18 11" />
    <path d="M10 21h28v18H10z" />
    <path d="M16 26v7m8-7v7m8-7v7M7 40h34" />
  </svg>
}

function ContactLink({ href, children }: { href: string, children: string }) {
  return <a href={href} className="font-bold text-teal-700 underline decoration-teal-700/30 underline-offset-4 hover:text-teal-600 hover:decoration-teal-600">{children}</a>
}

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
  const logoUnavailable = !profile.logoUrl || failedLogoUrl === profile.logoUrl
  const management = profile.management ?? []
  const selectedManagement = management.find((member) => member.id === selectedManagementId) ?? management[0]

  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-slate-600">
      <Link to="/" className="text-teal-700 underline decoration-teal-700/30 underline-offset-4 hover:text-teal-600 hover:decoration-teal-600">Home</Link>
      <span aria-hidden="true" className="text-slate-400">/</span>
      <Link to="/directory" className="text-teal-700 underline decoration-teal-700/30 underline-offset-4 hover:text-teal-600 hover:decoration-teal-600">Entities</Link>
      <span aria-hidden="true" className="text-slate-400">/</span>
      <span aria-current="page" className="min-w-0 truncate font-medium text-slate-500">{profile.name}</span>
    </nav>
    <article className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="grid gap-6 bg-linear-to-br from-navy-950 via-navy-900 to-teal-900 px-6 py-8 text-white sm:grid-cols-[auto_1fr] sm:items-center sm:px-8 sm:py-10 lg:px-10">
        <div className="flex size-24 shrink-0 items-center justify-center rounded-2xl bg-white p-3 shadow-lg shadow-navy-950/20 sm:size-28" data-testid="institution-logo">
          {profile.logoUrl && !logoUnavailable
            ? <img src={profile.logoUrl} alt={`${profile.name} logo`} onError={() => setFailedLogoUrl(profile.logoUrl)} className="max-h-full max-w-full object-contain" />
            : <InstitutionFallbackIcon />}
        </div>
        <div className="min-w-0"><p className="text-sm font-black tracking-[0.16em] text-teal-100 uppercase">Specified entity profile</p><h1 className="mt-2 text-3xl font-black tracking-tight text-balance sm:text-4xl lg:text-5xl">{profile.name}</h1><p className="mt-4 inline-flex max-w-full rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold text-teal-50 ring-1 ring-inset ring-white/15">{profile.category.code} — {profile.category.description}</p></div>
      </header>
      <div data-testid="profile-sections" className="grid gap-8 p-6 sm:p-8 lg:grid-cols-2 lg:p-10">
        <section className="border-b border-slate-200 pb-8 lg:col-span-2"><p className="text-sm font-black tracking-[0.16em] text-teal-700 uppercase">About this institution</p><h2 className="mt-2 text-2xl font-black tracking-tight text-navy-950">Institutional overview</h2><p className="mt-4 max-w-4xl whitespace-pre-line leading-7 text-slate-700">{profile.summary}</p></section>
        <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6"><h2 className="text-xl font-black text-navy-950">Location</h2><dl className="mt-5 grid gap-5 sm:grid-cols-2"><div><dt className="text-sm font-bold text-slate-500">Region</dt><dd className="mt-1.5 text-sm leading-6 text-slate-700">{profile.region || <NotProvided />}</dd></div><div><dt className="text-sm font-bold text-slate-500">City</dt><dd className="mt-1.5 text-sm leading-6 text-slate-700">{profile.city || <NotProvided />}</dd></div><div className="sm:col-span-2"><dt className="text-sm font-bold text-slate-500">Physical address</dt><dd className="mt-1.5 whitespace-pre-line text-sm leading-6 text-slate-700">{profile.physicalAddress || <NotProvided />}</dd></div><div className="sm:col-span-2"><dt className="text-sm font-bold text-slate-500">GhanaPost GPS digital address</dt><dd className="mt-1.5 text-sm leading-6 text-slate-700">{profile.gpsAddress || <NotProvided />}</dd></div>{profile.gpsLocationUrl && <div className="sm:col-span-2"><dt className="text-sm font-bold text-slate-500">Map</dt><dd className="mt-1.5 text-sm leading-6"><a href={profile.gpsLocationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-teal-700 underline decoration-teal-700/30 underline-offset-4 hover:text-teal-600 hover:decoration-teal-600">View on Google Maps <span aria-hidden="true">↗</span></a></dd></div>}</dl></section>
        <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6"><h2 className="text-xl font-black text-navy-950">Official contact information</h2><dl className="mt-5 space-y-5"><div><dt className="text-sm font-bold text-slate-500">Official institutional email</dt><dd className="mt-1.5 break-words text-sm leading-6">{profile.email ? <ContactLink href={`mailto:${profile.email}`}>{profile.email}</ContactLink> : <NotProvided />}</dd></div><div><dt className="text-sm font-bold text-slate-500">Official telephone number</dt><dd className="mt-1.5 text-sm leading-6">{profile.contactNumber ? <ContactLink href={telephoneHref}>{profile.contactNumber}</ContactLink> : <NotProvided />}</dd></div><div><dt className="text-sm font-bold text-slate-500">Official website</dt><dd className="mt-1.5 break-words text-sm leading-6">{profile.website ? <a href={profile.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-teal-700 underline decoration-teal-700/30 underline-offset-4 hover:text-teal-600 hover:decoration-teal-600">{profile.website} <span aria-hidden="true">↗</span></a> : <NotProvided />}</dd></div></dl></section>
        <section className="rounded-2xl border border-teal-900/10 bg-teal-50/50 p-5 lg:col-span-2 sm:p-6"><p className="text-sm font-black tracking-[0.16em] text-teal-700 uppercase">Published contacts</p><h2 className="mt-2 text-xl font-black text-navy-950">Management and leadership</h2>{management.length === 0 ? <p className="mt-4 text-sm leading-6 text-slate-600">No management or leadership information has been provided.</p> : <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.2fr)] lg:items-start"><div><label className="block text-sm font-bold text-slate-700" htmlFor="management-member">Select a member</label><select id="management-member" value={String(selectedManagement?.id ?? '')} onChange={(event) => setSelectedManagementId(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 shadow-xs focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"><option value="" disabled>Select a management member</option>{management.map((member) => <option key={member.id} value={member.id}>{member.fullName} — {member.position}</option>)}</select></div>{selectedManagement && <dl className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:grid-cols-2"><div><dt className="text-sm font-bold text-slate-500">Full name</dt><dd className="mt-1.5 font-black text-navy-950">{selectedManagement.fullName}</dd></div><div><dt className="text-sm font-bold text-slate-500">Official position</dt><dd className="mt-1.5 text-slate-700">{selectedManagement.position}</dd></div><div><dt className="text-sm font-bold text-slate-500">Official email</dt><dd className="mt-1.5 break-words text-sm leading-6">{selectedManagement.officialEmail ? <ContactLink href={`mailto:${selectedManagement.officialEmail}`}>{selectedManagement.officialEmail}</ContactLink> : <NotProvided />}</dd></div><div><dt className="text-sm font-bold text-slate-500">Official telephone</dt><dd className="mt-1.5 text-sm leading-6">{selectedManagement.officialPhone ? <ContactLink href={`tel:${selectedManagement.officialPhone.replace(/[^+\d]/g, '')}`}>{selectedManagement.officialPhone}</ContactLink> : <NotProvided />}</dd></div></dl>}</div>}</section>
      </div>
    </article>
  </div>
}

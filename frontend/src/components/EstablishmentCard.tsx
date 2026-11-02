import { Link } from 'react-router-dom'
import { useState } from 'react'
import type { PublicEstablishment } from '../api/publicApi'

export function EstablishmentCard({ establishment }: { establishment: PublicEstablishment }) {
  const [imageFailed, setImageFailed] = useState(false)
  const coverImage = establishment.coverImageUrl

  return (
    <article data-testid="entity-card" className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-teal-700/35 hover:shadow-md">
      <div className="relative h-36 overflow-hidden bg-navy-950 sm:h-40">
        {coverImage && !imageFailed
          ? <img src={coverImage} alt={`${establishment.name} institutional cover`} onError={() => setImageFailed(true)} className="h-full w-full object-cover" />
          : <div className="grid h-full place-items-center bg-linear-to-br from-navy-900 via-navy-800 to-teal-800" role="img" aria-label={`No institutional cover available for ${establishment.name}`}><svg viewBox="0 0 48 48" className="h-12 w-12 text-white/85" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 19 24 8l18 11" /><path d="M10 21h28v18H10z" /><path d="M16 26v7m8-7v7m8-7v7M7 40h34" /></svg></div>}
        <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-teal-800 shadow-sm">{establishment.category.code}</span>
      </div>
      <div className="flex grow flex-col p-5">
        <h2 className="text-xl font-black tracking-tight text-navy-950">{establishment.name}</h2>
        {establishment.supervisingMinistry && <p className="mt-3 text-sm leading-6 text-slate-600"><span className="font-bold text-slate-700">Supervising ministry:</span> {establishment.supervisingMinistry}</p>}
        <div className="mt-auto pt-6"><Link className="inline-flex items-center rounded-lg bg-navy-950 px-3.5 py-2.5 text-sm font-bold text-white transition hover:bg-navy-800 focus:outline-none" to={`/establishments/${establishment.slug}`}>View Details <span className="ml-2" aria-hidden="true">→</span></Link></div>
      </div>
    </article>
  )
}

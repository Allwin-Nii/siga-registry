import { Link } from 'react-router-dom'
import { categoryLabel } from '../data/mockData'
import type { Establishment } from '../types'

export function EstablishmentCard({ establishment }: { establishment: Establishment }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-700/35 hover:shadow-md">
      <div><span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-800">{categoryLabel(establishment.categoryId)}</span></div>
      <h2 className="mt-5 text-xl font-black tracking-tight text-navy-950">{establishment.name}</h2>
      <p className="mt-4 text-sm leading-6 text-slate-600">{establishment.summary}</p>
      <div className="mt-auto pt-6"><Link className="inline-flex items-center rounded-lg bg-navy-950 px-3.5 py-2.5 text-sm font-bold text-white transition hover:bg-navy-800 focus:outline-none" to={`/establishments/${establishment.slug}`}>View Details <span className="ml-2" aria-hidden="true">→</span></Link></div>
    </article>
  )
}

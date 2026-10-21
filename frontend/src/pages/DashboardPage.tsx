import { Link } from 'react-router-dom'
import { Badge } from '../components/Badge'
import { SectionHeading } from '../components/SectionHeading'
import { categoryLabel } from '../data/mockData'
import { useRegistry } from '../state/useRegistry'

export function DashboardPage() {
  const { establishments } = useRegistry()
  const summary = [
    { label: 'Draft records', value: establishments.filter((record) => record.status === 'Draft').length, note: 'Records that remain unpublished' },
    { label: 'Awaiting review', value: establishments.filter((record) => record.status === 'Pending review').length, note: 'Submitted records awaiting a decision' },
    { label: 'Published records', value: establishments.filter((record) => record.status === 'Published').length, note: 'Visible in the public directory' },
  ]

  return <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"><SectionHeading eyebrow="Staff workspace · prototype" title="Your record overview" description="Create, edit, save, and submit fictional establishment records using shared in-memory state. Changes reset when the browser refreshes." /><Link to="/staff/records/new" className="inline-flex w-fit rounded-lg bg-teal-700 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-teal-600">Create establishment</Link></div>
    <div className="mt-10 grid gap-5 sm:grid-cols-3">{summary.map((item) => <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" key={item.label}><p className="text-sm font-bold text-slate-500">{item.label}</p><p className="mt-3 text-4xl font-black tracking-tight text-navy-950">{item.value}</p><p className="mt-2 text-sm text-slate-600">{item.note}</p></section>)}</div>
    <section className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-6 py-5"><h2 className="font-black text-navy-950">Establishment records</h2><p className="mt-1 text-sm text-slate-500">All names, contact details, dates, and statuses are illustrative.</p></div><div className="overflow-x-auto"><table className="w-full min-w-175 text-left text-sm"><caption className="sr-only">Fictional establishment records by workflow status</caption><thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase"><tr><th className="px-6 py-3 font-bold">Establishment</th><th className="px-6 py-3 font-bold">Category</th><th className="px-6 py-3 font-bold">Last updated</th><th className="px-6 py-3 font-bold">Status</th><th className="px-6 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-slate-100">{establishments.map((record) => <tr key={record.id} className="hover:bg-slate-50"><td className="px-6 py-4"><div className="font-bold text-navy-950">{record.name}</div></td><td className="px-6 py-4 text-slate-600">{categoryLabel(record.categoryId)}</td><td className="px-6 py-4 text-slate-600">{record.lastUpdated}</td><td className="px-6 py-4"><Badge status={record.status} /></td><td className="px-6 py-4 text-right"><div className="flex justify-end gap-3">{record.status === 'Published' && <Link to={`/establishments/${record.slug}`} className="font-bold text-slate-700 hover:text-navy-950">View<span className="sr-only"> {record.name}</span></Link>}<Link to={`/staff/records/${record.id}/edit`} className="font-bold text-teal-700 hover:text-teal-600">Edit<span className="sr-only"> {record.name}</span></Link></div></td></tr>)}</tbody></table></div></section>
  </div>
}

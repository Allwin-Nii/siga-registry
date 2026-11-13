import { useMemo, useState } from 'react'

export type ChartSeries = {
  label: string
  value: number
  color: string
}

const percentage = (value: number, total: number) => total === 0 ? 0 : Math.round((value / total) * 100)

export function DonutChart({
  title,
  series,
  centreLabel,
  singularNoun = 'record',
  pluralNoun = 'records',
}: {
  title: string
  series: ChartSeries[]
  centreLabel: string
  singularNoun?: string
  pluralNoun?: string
}) {
  const total = useMemo(() => series.reduce((sum, item) => sum + item.value, 0), [series])
  const [activeIndex, setActiveIndex] = useState(0)
  const active = series[activeIndex] ?? series[0]
  const radius = 42
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return <section data-testid="admin-category-chart" className="h-full min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-3" aria-labelledby={`${title}-heading`}>
    <h2 id={`${title}-heading`} className="text-sm font-black text-navy-950">{title}</h2>
    <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:items-start lg:mt-2 lg:gap-2">
      <div data-testid="admin-category-donut" className="relative h-28 w-28 shrink-0 lg:h-24 lg:w-24">
        <svg viewBox="0 0 120 120" className="h-full w-full" role="img" aria-label={`${title}: ${series.map((item) => `${item.label}, ${item.value}`).join('; ') || 'no records'}`}>
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="16" />
          {total > 0 && series.map((item, index) => {
            const length = (item.value / total) * circumference
            const element = <circle
              key={item.label}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={activeIndex === index ? 18 : 16}
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform="rotate(-90 60 60)"
              className="transition-all duration-150"
            />
            offset += length
            return <g
              key={`${item.label}-interactive`}
              tabIndex={0}
              role="img"
              aria-label={`${item.label}: ${item.value}, ${percentage(item.value, total)} percent`}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
            >{element}</g>
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <strong className="text-xl font-black tracking-tight text-navy-950">{total}</strong>
          <span className="max-w-16 text-[9px] leading-3 font-bold tracking-wide text-slate-500 uppercase">{centreLabel}</span>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-0.5 self-stretch lg:space-y-0">
        {series.map((item, index) => <button type="button" key={item.label} onMouseEnter={() => setActiveIndex(index)} onFocus={() => setActiveIndex(index)} onClick={() => setActiveIndex(index)} className={`flex w-full items-center justify-between rounded-md px-1.5 py-0.5 text-left text-xs transition lg:py-0 ${activeIndex === index ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
          <span className="flex min-w-0 items-center gap-1.5"><span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} /><span className="truncate font-semibold text-slate-700">{item.label}</span></span>
          <span className="ml-2 shrink-0 text-[11px] font-bold text-slate-500">{item.value} · {percentage(item.value, total)}%</span>
        </button>)}
      </div>
    </div>
    {active && <p className="mt-1.5 rounded-md bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 lg:mt-1" aria-live="polite"><span className="font-bold text-navy-950">{active.label}</span>: {active.value} {active.value === 1 ? singularNoun : pluralNoun} ({percentage(active.value, total)}%).</p>}
  </section>
}

export function RegionBarChart({ regions }: { regions: Array<{ region: string; count: number }> }) {
  const maximum = Math.max(...regions.map((item) => item.count), 0)

  return <section data-testid="admin-regional-chart" className="h-full min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-3" aria-labelledby="regional-distribution-heading">
    <div className="flex items-start justify-between gap-4 lg:gap-2"><div><h2 id="regional-distribution-heading" className="text-base font-black text-navy-950">Regional distribution</h2><p className="mt-1 text-xs text-slate-500">Entities with a recorded region</p></div><span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-700">{regions.reduce((sum, item) => sum + item.count, 0)} records</span></div>
    {regions.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center lg:mt-3 lg:py-4"><p className="text-sm font-bold text-slate-700">No regional information yet</p><p className="mt-1 text-xs text-slate-500">Add regions to entity profiles to see their distribution.</p></div> : <div className="mt-4 space-y-3 lg:mt-3 lg:space-y-2" role="img" aria-label={regions.map((item) => `${item.region}: ${item.count}`).join('; ')}>{regions.map((item) => <div key={item.region}><div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="truncate font-semibold text-slate-700">{item.region}</span><span className="shrink-0 font-bold text-navy-950">{item.count}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-700 transition-all" style={{ width: `${maximum === 0 ? 0 : (item.count / maximum) * 100}%` }} /></div></div>)}</div>}
  </section>
}

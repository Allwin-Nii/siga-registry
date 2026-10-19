export function SectionHeading({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return <div className="max-w-2xl"><p className="mb-2 text-sm font-black tracking-[0.16em] text-teal-700 uppercase">{eyebrow}</p><h1 className="text-3xl font-black tracking-tight text-navy-950 sm:text-4xl">{title}</h1>{description && <p className="mt-3 text-base leading-7 text-slate-600">{description}</p>}</div>
}

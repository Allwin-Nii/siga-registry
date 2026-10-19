export function SimulationNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`rounded-xl border border-teal-700/20 bg-teal-100/65 text-sm text-navy-900 ${compact ? 'px-3 py-2' : 'px-4 py-3'}`} role="status">
      <span className="font-bold">Prototype mode:</span> all organisations, categories, records, actions, authentication, approvals, uploads, and saving are fictional or simulated. Nothing is secure or persistent until a backend is implemented.
    </div>
  )
}

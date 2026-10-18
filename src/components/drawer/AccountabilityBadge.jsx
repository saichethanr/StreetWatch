import { Landmark } from 'lucide-react'

export default function AccountabilityBadge({ report }) {
  const rows = [
    ['Assembly Constituency', report.assembly_constituency],
    ['MLA', report.mla_name],
    ['Ward', report.ward_number_name],
    ['Ward Councillor', report.councillor_name],
  ]
  const mapped = rows.some(([, value]) => value)

  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-900">
        <Landmark size={16} />
        Political Accountability
      </h3>
      {mapped ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-amber-700">{label}</dt>
              <dd className="text-sm font-semibold text-slate-900">{value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-amber-800">Jurisdiction for this location has not been mapped yet.</p>
      )}
    </section>
  )
}

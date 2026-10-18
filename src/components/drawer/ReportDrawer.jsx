import { useEffect, useState } from 'react'
import { CheckCircle2, Clock, LoaderCircle, ThumbsUp, X } from 'lucide-react'
import { fetchReport } from '../../api/reports'
import { CATEGORIES } from '../../constants/categories'
import AccountabilityBadge from './AccountabilityBadge'
import CommentFeed from './CommentFeed'

export default function ReportDrawer({ reportId, onClose }) {
  const [report, setReport] = useState(null)
  const [error, setError] = useState(null)
  const open = reportId !== null

  useEffect(() => {
    if (!reportId) return
    let ignore = false
    setReport(null)
    setError(null)
    fetchReport(reportId).then(
      (data) => !ignore && setReport(data),
      (err) => !ignore && setError(err),
    )
    return () => {
      ignore = true
    }
  }, [reportId])

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open, onClose])

  return (
    // Full width on phones, a 420px panel from the sm breakpoint up.
    // Content stays mounted while closed so the slide-out animates.
    <aside
      aria-label="Report details"
      inert={!open}
      className={`absolute inset-y-0 right-0 z-[1100] flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-[420px] ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {error ? (
        <DrawerMessage onClose={onClose}>Could not load this report.</DrawerMessage>
      ) : !report ? (
        <DrawerMessage onClose={onClose}>
          <LoaderCircle className="animate-spin text-slate-400" size={24} />
        </DrawerMessage>
      ) : (
        <ReportDetails report={report} onClose={onClose} />
      )}
    </aside>
  )
}

function ReportDetails({ report, onClose }) {
  const { label, Icon, color } = CATEGORIES[report.category]
  const resolved = report.status === 'resolved'

  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: color }}
          >
            <Icon size={16} />
          </span>
          <h2 className="font-semibold text-slate-900">{label}</h2>
        </div>
        <CloseButton onClose={onClose} />
      </div>

      <div className="flex-1 overflow-y-auto">
        <img src={report.image_url} alt={label} className="aspect-[4/3] w-full bg-slate-100 object-cover" />

        <div className="space-y-5 p-4">
          <div className="grid grid-cols-2 gap-3">
            {resolved ? (
              <Stat icon={<CheckCircle2 size={16} />} value="Resolved" label="Status" tone="green" />
            ) : (
              <Stat icon={<Clock size={16} />} value={report.days_ignored} label="days ignored" tone="red" />
            )}
            <Stat icon={<ThumbsUp size={16} />} value={report.upvotes_count} label="upvotes" tone="slate" />
          </div>

          {report.description && <p className="text-sm leading-relaxed text-slate-700">{report.description}</p>}

          <p className="text-xs text-slate-500">
            Reported {report.reporter ? `by @${report.reporter.username} ` : ''}on{' '}
            {new Date(report.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
          </p>

          <AccountabilityBadge report={report} />

          <CommentFeed reportId={report.id} />
        </div>
      </div>
    </>
  )
}

const STAT_TONES = {
  red: 'bg-red-50 text-red-700',
  green: 'bg-green-50 text-green-700',
  slate: 'bg-slate-100 text-slate-700',
}

function Stat({ icon, value, label, tone }) {
  return (
    <div className={`rounded-xl px-3 py-2.5 ${STAT_TONES[tone]}`}>
      <div className="flex items-center gap-1.5 text-2xl font-bold">
        {icon}
        {value}
      </div>
      <div className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</div>
    </div>
  )
}

function DrawerMessage({ children, onClose }) {
  return (
    <>
      <div className="flex justify-end px-4 py-3">
        <CloseButton onClose={onClose} />
      </div>
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-slate-500">{children}</div>
    </>
  )
}

function CloseButton({ onClose }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close details"
      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
    >
      <X size={20} />
    </button>
  )
}

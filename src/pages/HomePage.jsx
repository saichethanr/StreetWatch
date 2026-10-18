import { useEffect, useState } from 'react'
import { LogOut, MapPin, Plus } from 'lucide-react'
import { fetchActiveReports } from '../api/reports'
import { supabase } from '../supabaseClient'
import AuthScreen from '../components/AuthScreen'
import ReportMap from '../components/map/ReportMap'
import ReportDrawer from '../components/drawer/ReportDrawer'
import VerifiedReportForm from '../components/VerifiedReportForm'

export default function HomePage() {
  const [reports, setReports] = useState([])
  const [loadError, setLoadError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [session, setSession] = useState(null)
  const [panel, setPanel] = useState(null) // null | 'auth' | 'report'

  useEffect(() => {
    fetchActiveReports().then(setReports, setLoadError)
  }, [])

  // Fires once with the current session, then on every sign-in and sign-out.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      // Signing in from the prompt continues to the report form; signing out closes it.
      setPanel((current) => {
        if (nextSession && current === 'auth') return 'report'
        if (!nextSession && current === 'report') return null
        return current
      })
    })
    return () => data.subscription.unsubscribe()
  }, [])

  function openReportForm() {
    setSelectedId(null)
    setPanel(session ? 'report' : 'auth')
  }

  function handleReportSubmitted(report) {
    setReports((current) => [...current, report])
    setPanel(null)
    setSelectedId(report.id)
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-slate-100">
      <ReportMap reports={reports} selectedId={selectedId} onSelect={setSelectedId} />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex items-start justify-between gap-3 p-3 sm:p-4">
        <div className="pointer-events-auto inline-flex items-center gap-3 rounded-xl bg-white/95 px-4 py-2.5 shadow-lg ring-1 ring-black/5 backdrop-blur">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white">
            <MapPin size={18} />
          </span>
          <div>
            <h1 className="text-base font-bold leading-tight text-slate-900">StreetWatch</h1>
            <p className="text-xs text-slate-500">
              {loadError ? 'Could not load reports' : `${reports.length} active issues`}
            </p>
          </div>
        </div>

        {session && (
          <div className="pointer-events-auto flex min-w-0 items-center gap-1 rounded-xl bg-white/95 py-1.5 pl-3 pr-1.5 shadow-lg ring-1 ring-black/5 backdrop-blur">
            <span className="truncate text-xs font-medium text-slate-700">{session.user.email}</span>
            <button
              type="button"
              onClick={() => supabase.auth.signOut()}
              aria-label="Sign out"
              title="Sign out"
              className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </header>

      {!panel && (
        <button
          type="button"
          onClick={openReportForm}
          className="absolute bottom-8 right-4 z-[1000] flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-red-700 sm:bottom-10 sm:right-6"
        >
          <Plus size={18} />
          Report issue
        </button>
      )}

      <ReportDrawer reportId={selectedId} onClose={() => setSelectedId(null)} />

      {panel === 'auth' && <AuthScreen onClose={() => setPanel(null)} />}

      {/* Mounted only while open, so each opening takes a fresh GPS fix. */}
      {panel === 'report' && <VerifiedReportForm onClose={() => setPanel(null)} onSubmitted={handleReportSubmitted} />}
    </div>
  )
}

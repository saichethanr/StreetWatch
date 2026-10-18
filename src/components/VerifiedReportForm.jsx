import { useEffect, useState } from 'react'
import {
  Camera,
  CircleCheck,
  LoaderCircle,
  LocateFixed,
  MapPinOff,
  RotateCw,
  ShieldCheck,
  TriangleAlert,
  X,
} from 'lucide-react'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'
import { CATEGORIES } from '../constants/categories'

// Early feedback only; the submit-verified-report Edge Function enforces the same limits.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MIN_DESCRIPTION = 10
const MAX_DESCRIPTION = 1000

export default function VerifiedReportForm({ onClose, onSubmitted }) {
  // { status: 'locating' } | { status: 'locked', latitude, longitude, accuracy } | { status: 'error', message }
  const [gps, setGps] = useState({ status: 'locating' })
  const [imageFile, setImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [category, setCategory] = useState(null)
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  // Location comes only from the device; there is no manual entry.
  function lockLocation() {
    setGps({ status: 'locating' })
    if (!navigator.geolocation) {
      setGps({ status: 'error', message: 'This browser cannot share your location.' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        setGps({
          status: 'locked',
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        }),
      (error) =>
        setGps({
          status: 'error',
          message:
            error.code === error.PERMISSION_DENIED
              ? 'Location access is blocked. Allow it in your browser settings to report an issue.'
              : 'Could not get a GPS fix. Move to an open area and retry.',
        }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  useEffect(lockLocation, [])

  useEffect(() => {
    if (!imageFile) return
    const url = URL.createObjectURL(imageFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(timer)
  }, [toast])

  function handleImageChange(event) {
    const file = event.target.files[0]
    event.target.value = '' // allow re-selecting the same file
    if (!file) return
    if (!IMAGE_TYPES.includes(file.type)) return setToast('Use a JPEG, PNG, or WebP photo.')
    if (file.size > MAX_IMAGE_BYTES) return setToast('Photo must be 5 MB or smaller.')
    setImageFile(file)
  }

  const trimmedDescription = description.trim()
  const canSubmit =
    gps.status === 'locked' &&
    imageFile &&
    category &&
    trimmedDescription.length >= MIN_DESCRIPTION &&
    !submitting

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit) return

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return setToast('Sign in to submit a report.')

    // The Edge Function authenticates the user, verifies the photo with AI,
    // uploads it, and inserts the report. The browser cannot insert directly.
    const body = new FormData()
    body.append('image', imageFile)
    body.append('category', category)
    body.append('description', trimmedDescription)
    body.append('latitude', String(gps.latitude))
    body.append('longitude', String(gps.longitude))

    setSubmitting(true)
    const { data, error } = await supabase.functions.invoke('submit-verified-report', { body })
    setSubmitting(false)

    if (error) {
      // 4xx/5xx responses carry a user-facing { error } message, e.g. the AI rejection.
      const details = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null
      setToast(details?.error ?? 'Could not submit the report. Please try again.')
      return
    }
    onSubmitted(data.report)
  }

  return (
    <aside
      aria-label="Report an issue"
      className="absolute inset-y-0 right-0 z-[1100] flex w-full flex-col bg-white shadow-2xl sm:w-[420px]"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <ShieldCheck size={18} />
          </span>
          <div>
            <h2 className="font-semibold leading-tight text-slate-900">Report an issue</h2>
            <p className="text-xs text-slate-500">GPS-locked and AI-verified</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close form"
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          <section>
            <FieldLabel step={1}>Location</FieldLabel>
            <LocationStatus gps={gps} onRetry={lockLocation} />
          </section>

          <section>
            <FieldLabel step={2}>Photo of the issue</FieldLabel>
            {previewUrl ? (
              <div className="relative overflow-hidden rounded-xl">
                <img src={previewUrl} alt="Selected issue" className="aspect-[4/3] w-full object-cover" />
                <label className="absolute bottom-2 right-2 flex cursor-pointer items-center gap-1.5 rounded-lg bg-black/70 px-3 py-1.5 text-xs font-medium text-white hover:bg-black/80">
                  <Camera size={14} />
                  Change photo
                  <PhotoInput onChange={handleImageChange} />
                </label>
              </div>
            ) : (
              <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-slate-400 hover:bg-slate-100">
                <Camera size={28} />
                <span className="text-sm font-medium text-slate-700">Take a photo</span>
                <span className="text-xs">JPEG, PNG or WebP, up to 5 MB</span>
                <PhotoInput onChange={handleImageChange} />
              </label>
            )}
          </section>

          <section>
            <FieldLabel step={3}>Category</FieldLabel>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(CATEGORIES).map(([key, { label, Icon, color }]) => {
                const selected = category === key
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setCategory(key)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 text-center text-xs font-medium transition-colors ${
                      selected
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: color }}
                    >
                      <Icon size={15} />
                    </span>
                    {label}
                  </button>
                )
              })}
            </div>
          </section>

          <section>
            <FieldLabel step={4} htmlFor="report-description">
              Description
            </FieldLabel>
            <textarea
              id="report-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={MAX_DESCRIPTION}
              rows={4}
              placeholder="What is the problem, and where exactly? e.g. Open manhole on the left lane next to the bus stop."
              className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
            <p className="mt-1 text-right text-xs text-slate-500">
              {trimmedDescription.length < MIN_DESCRIPTION
                ? `At least ${MIN_DESCRIPTION} characters`
                : `${description.length}/${MAX_DESCRIPTION}`}
            </p>
          </section>
        </div>

        <div className="border-t border-slate-200 p-4">
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? <LoaderCircle size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
            {submitting ? 'Verifying & publishing…' : 'Verify & submit report'}
          </button>
          <p className="mt-2 text-center text-xs text-slate-500">
            Photos are checked by AI before they are published.
          </p>
        </div>
      </form>

      {toast && (
        <div
          role="alert"
          className="absolute inset-x-4 bottom-28 flex items-start gap-2.5 rounded-xl bg-red-600 px-4 py-3 text-sm text-white shadow-lg"
        >
          <TriangleAlert size={18} className="mt-0.5 shrink-0" />
          <p className="flex-1">{toast}</p>
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss" className="shrink-0 opacity-80 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      )}
    </aside>
  )
}

function LocationStatus({ gps, onRetry }) {
  if (gps.status === 'locating') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
        <LoaderCircle size={22} className="shrink-0 animate-spin text-slate-500" />
        <div>
          <p className="text-sm font-semibold text-slate-900">Locking GPS location…</p>
          <p className="text-xs text-slate-500">Allow location access when your browser asks.</p>
        </div>
      </div>
    )
  }

  if (gps.status === 'error') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5">
        <MapPinOff size={22} className="mt-0.5 shrink-0 text-red-600" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-red-800">Location required</p>
          <p className="text-xs text-red-700">{gps.message}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-100"
        >
          <RotateCw size={13} />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
      <CircleCheck size={22} className="shrink-0 text-emerald-600" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-emerald-900">GPS Location Locked</p>
        <p className="font-mono text-xs text-emerald-800">
          {gps.latitude.toFixed(5)}, {gps.longitude.toFixed(5)}
        </p>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-xs text-emerald-700">
        <LocateFixed size={13} />±{Math.round(gps.accuracy)} m
      </span>
    </div>
  )
}

function FieldLabel({ step, htmlFor, children }) {
  const Tag = htmlFor ? 'label' : 'h3'
  return (
    <Tag htmlFor={htmlFor} className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] text-white">
        {step}
      </span>
      {children}
    </Tag>
  )
}

// capture="environment" opens the rear camera directly on phones.
function PhotoInput({ onChange }) {
  return (
    <input
      type="file"
      accept="image/jpeg,image/png,image/webp"
      capture="environment"
      onChange={onChange}
      className="sr-only"
    />
  )
}

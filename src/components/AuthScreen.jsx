import { useState } from 'react'
import {
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Lock,
  Mail,
  MailCheck,
  ShieldCheck,
  TriangleAlert,
  User,
  X,
} from 'lucide-react'
import { supabase } from '../supabaseClient'

// Supabase Auth's default minimum password length.
const MIN_PASSWORD = 6

const SUBMIT_LABELS = {
  signin: 'Sign in',
  signup: 'Create account',
  magic: 'Email me a sign-in link',
}

// Sign-in modal. A successful sign-in fires supabase.auth.onAuthStateChange,
// which the parent listens to; this component only collects credentials.
export default function AuthScreen({ onClose }) {
  const [method, setMethod] = useState('password') // 'password' | 'magic'
  const [mode, setMode] = useState('signin') // 'signin' | 'signup' (password method only)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const action = method === 'magic' ? 'magic' : mode

  function switchTo(nextMethod, nextMode = 'signin') {
    setMethod(nextMethod)
    setMode(nextMode)
    setError(null)
    setNotice(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)

    // Links in confirmation and magic-link emails return here. This URL must be
    // listed under Authentication > URL Configuration > Redirect URLs in Supabase.
    const emailRedirectTo = window.location.origin
    const address = email.trim()
    let result

    if (action === 'magic') {
      result = await supabase.auth.signInWithOtp({ email: address, options: { emailRedirectTo } })
      if (!result.error) setNotice(`We sent a sign-in link to ${address}. Open it on this device to continue.`)
    } else if (action === 'signup') {
      result = await supabase.auth.signUp({
        email: address,
        password,
        // full_name is copied into public.profiles by the handle_new_user trigger.
        options: { emailRedirectTo, data: { full_name: fullName.trim() || undefined } },
      })
      // With email confirmation on, sign-up returns no session until the link is clicked.
      if (!result.error && !result.data.session) {
        setNotice(`Check ${address} for a confirmation link, then sign in.`)
      }
    } else {
      result = await supabase.auth.signInWithPassword({ email: address, password })
    }

    setBusy(false)
    if (result.error) setError(result.error.message)
  }

  return (
    <div className="absolute inset-0 z-[1200] flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className="w-full max-w-md rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between px-6 pt-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <ShieldCheck size={22} />
            </span>
            <div>
              <h2 id="auth-title" className="text-lg font-bold text-slate-900">
                {action === 'signup' ? 'Create your account' : 'Sign in to report'}
              </h2>
              <p className="text-sm text-slate-500">Every report is tied to a verified account.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign-in"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 pb-6 pt-5">
          <div role="tablist" aria-label="Sign-in method" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            <MethodTab active={method === 'password'} onClick={() => switchTo('password')} icon={<KeyRound size={15} />}>
              Password
            </MethodTab>
            <MethodTab active={method === 'magic'} onClick={() => switchTo('magic')} icon={<Mail size={15} />}>
              Magic link
            </MethodTab>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {action === 'signup' && (
              <Field label="Full name (optional)" icon={<User size={16} />}>
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  autoComplete="name"
                  maxLength={100}
                  placeholder="Asha Rao"
                  className={INPUT_CLASS}
                />
              </Field>
            )}

            <Field label="Email" icon={<Mail size={16} />}>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                className={INPUT_CLASS}
              />
            </Field>

            {method === 'password' && (
              <Field label="Password" icon={<Lock size={16} />}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={action === 'signup' ? MIN_PASSWORD : undefined}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={action === 'signup' ? 'new-password' : 'current-password'}
                  placeholder={action === 'signup' ? `At least ${MIN_PASSWORD} characters` : 'Your password'}
                  className={`${INPUT_CLASS} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </Field>
            )}

            {method === 'magic' && (
              <p className="text-sm text-slate-500">
                No password needed. We'll email you a one-time link; new emails get an account automatically.
              </p>
            )}

            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}
            {notice && (
              <div role="status" className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                <MailCheck size={16} className="mt-0.5 shrink-0" />
                {notice}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
            >
              {busy && <LoaderCircle size={16} className="animate-spin" />}
              {SUBMIT_LABELS[action]}
            </button>
          </form>

          {method === 'password' && (
            <p className="mt-5 text-center text-sm text-slate-500">
              {mode === 'signin' ? 'New to StreetWatch? ' : 'Already have an account? '}
              <button
                type="button"
                onClick={() => switchTo('password', mode === 'signin' ? 'signup' : 'signin')}
                className="font-semibold text-emerald-700 hover:text-emerald-800"
              >
                {mode === 'signin' ? 'Create an account' : 'Sign in'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

const INPUT_CLASS =
  'w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900'

function MethodTab({ active, onClick, icon, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors ${
        active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

function Field({ label, icon, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
        {children}
      </span>
    </label>
  )
}

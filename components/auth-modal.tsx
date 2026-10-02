'use client'

import { FormEvent, useState } from 'react'
import { X, LogIn, LoaderCircle, Mail, Lock, User, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type AuthModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (email: string) => void
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!isOpen) return null

  async function handleGoogleSignIn() {
    setBusy(true)
    setError('')
    const supabase = createClient()
    if (!supabase) {
      setBusy(false)
      setError('Supabase is not configured. Please check your credentials.')
      return
    }

    const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    })

    if (authError) {
      setBusy(false)
      setError(authError.message)
    }
  }

  async function handleEmailAuth(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setSuccess('')

    const supabase = createClient()
    if (!supabase) {
      setBusy(false)
      setError('Supabase is not configured.')
      return
    }

    if (tab === 'signup') {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
          },
        },
      })
      setBusy(false)
      if (signUpError) {
        setError(signUpError.message)
      } else {
        if (data.session) {
          if (onSuccess && data.user?.email) onSuccess(data.user.email)
          onClose()
        } else {
          setSuccess('Account created! Please check your email to confirm your account, or sign in.')
        }
      }
    } else {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      setBusy(false)
      if (signInError) {
        setError(signInError.message)
      } else {
        if (onSuccess && data.user?.email) onSuccess(data.user.email)
        onClose()
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#10231c]/55 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl transition-all">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#d7f6e4] text-base font-bold text-[#0b5b43]">
              M
            </span>
            <div>
              <span className="block font-serif text-lg font-bold leading-tight text-[#10231c]">
                Mama Oche
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#71847b]">
                Fresh Provisions · Abuja
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-3 text-center">
          <h3 className="font-serif text-2xl font-bold text-[#10231c]">
            {tab === 'signin' ? 'Sign in to your account' : 'Create an account'}
          </h3>
          <p className="mt-1.5 text-xs text-[#60736a]">
            Access your Abuja orders, track live dispatch, and enjoy faster checkout.
          </p>
        </div>

        {/* Google OAuth Button */}
        <div className="mt-6">
          <button
            type="button"
            disabled={busy}
            onClick={handleGoogleSignIn}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-[#cfe6d8] bg-white py-3 px-4 text-sm font-bold text-[#10231c] shadow-sm transition hover:bg-[#eff9f2] disabled:opacity-50"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-5 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#e2eee8]" />
          </div>
          <span className="relative bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-[#9aa8a1]">
            or sign in with email
          </span>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-[#f1f8f3] p-1 text-xs font-bold text-[#5d7068]">
          <button
            type="button"
            onClick={() => {
              setTab('signin')
              setError('')
              setSuccess('')
            }}
            className={`flex-1 rounded-lg py-2 transition ${
              tab === 'signin' ? 'bg-white text-[#0b5b43] shadow-sm' : 'hover:text-[#0b5b43]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('signup')
              setError('')
              setSuccess('')
            }}
            className={`flex-1 rounded-lg py-2 transition ${
              tab === 'signup' ? 'bg-white text-[#0b5b43] shadow-sm' : 'hover:text-[#0b5b43]'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailAuth} className="mt-4 space-y-3.5">
          {tab === 'signup' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4f665b]">
                Full Name
                <div className="relative mt-1">
                  <User size={16} className="absolute left-3.5 top-3 text-[#71847b]" />
                  <input
                    required
                    type="text"
                    placeholder="e.g. Mrs. Amina Okafor"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-[#d7e8dc] pl-10 pr-3.5 py-2.5 text-sm text-[#10231c] outline-none focus:ring-2 focus:ring-[#b7e9c8]"
                  />
                </div>
              </label>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4f665b]">
              Email Address
              <div className="relative mt-1">
                <Mail size={16} className="absolute left-3.5 top-3 text-[#71847b]" />
                <input
                  required
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-[#d7e8dc] pl-10 pr-3.5 py-2.5 text-sm text-[#10231c] outline-none focus:ring-2 focus:ring-[#b7e9c8]"
                />
              </div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4f665b]">
              Password
              <div className="relative mt-1">
                <Lock size={16} className="absolute left-3.5 top-3 text-[#71847b]" />
                <input
                  required
                  type="password"
                  placeholder="••••••••"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#d7e8dc] pl-10 pr-3.5 py-2.5 text-sm text-[#10231c] outline-none focus:ring-2 focus:ring-[#b7e9c8]"
                />
              </div>
            </label>
          </div>

          {error && (
            <div className="rounded-xl bg-[#fdf2f0] p-3 text-xs font-semibold text-[#b13c2e]">
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-xl bg-[#eff9f2] p-3 text-xs font-semibold text-[#0b5b43]">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b5b43] py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#074835] disabled:opacity-60"
          >
            {busy ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <LogIn size={17} />
            )}
            <span>{tab === 'signin' ? 'Sign In to Account' : 'Create Mama Oche Account'}</span>
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[#71847b] hover:text-[#0b5b43] hover:underline"
          >
            Continue shopping as guest (pay on delivery)
          </button>
        </div>
      </div>
    </div>
  )
}


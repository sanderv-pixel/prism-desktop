'use client'

import { useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import { TurnstileWidget } from '@/components/TurnstileWidget'
import { Button } from '@/components/Button'
import { AlertCircle, CheckCircle2, Mail, Lock } from 'lucide-react'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

export function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/'
  const referralCode = searchParams.get('ref') ?? ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaState, setCaptchaState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const turnstileRef = useRef<TurnstileInstance>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (honeypot) {
      // Honeypot caught a bot. Pretend success to avoid revealing the trap.
      setSuccess(true)
      setLoading(false)
      return
    }

    if (TURNSTILE_SITE_KEY && !captchaToken) {
      if (captchaState === 'error') {
        setError('CAPTCHA could not load. Try refreshing the page or disabling ad blockers.')
      } else {
        setError('CAPTCHA verification is still loading. Please wait a moment.')
      }
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          captchaToken,
          redirect,
          acceptedTerms,
          acceptedPrivacy,
          honeypot,
          referralCode,
        }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error ?? 'Sign-up failed')
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-up failed')
      turnstileRef.current?.reset()
      setCaptchaToken(null)
      setCaptchaState('loading')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-24 bg-muted/30">
      <div className="w-full max-w-md rounded-2xl card p-8">
        <p className="eyebrow mb-3">Get started</p>
        <h1 className="text-2xl font-semibold text-foreground mb-2">Create your Prism account</h1>
        <p className="text-muted-foreground mb-8">
          One account for both creator earnings and advertiser campaigns.
        </p>

        {success ? (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-center">
            <CheckCircle2 size={32} className="mx-auto text-emerald-600 mb-3" />
            <p className="text-lg font-medium text-emerald-800">Check your email</p>
            <p className="text-sm text-emerald-700 mt-1">
              We sent a confirmation link to {email}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 relative">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input pl-10 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input pl-10 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Honeypot field: hidden from humans, filled by bots */}
            <div className="absolute opacity-0 -z-10" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                type="text"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {TURNSTILE_SITE_KEY && (
              <div className="space-y-2">
                <div className="flex justify-center min-h-[65px]">
                  {captchaState !== 'error' ? (
                    <TurnstileWidget
                      ref={turnstileRef}
                      siteKey={TURNSTILE_SITE_KEY}
                      action="turnstile-spin-v1"
                      onLoad={() => setCaptchaState('loading')}
                      onSuccess={(token) => {
                        setCaptchaToken(token)
                        setCaptchaState('ready')
                      }}
                      onError={() => {
                        setCaptchaToken(null)
                        setCaptchaState('error')
                      }}
                      onExpire={() => {
                        setCaptchaToken(null)
                        setCaptchaState('loading')
                      }}
                    />
                  ) : (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600 text-center w-full">
                      CAPTCHA could not load. Please disable any ad blockers or
                      privacy extensions and refresh the page.
                    </div>
                  )}
                </div>
                {captchaState === 'loading' && !captchaToken && (
                  <p className="text-center text-xs text-muted-foreground">
                    Loading verification…
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              <label className="flex items-start gap-3 text-sm text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border bg-input text-primary focus:ring-primary/40"
                  required
                />
                <span>
                  I agree to the{' '}
                  <Link
                    href="/terms"
                    target="_blank"
                    className="text-primary hover:text-violet-700"
                  >
                    Terms of Service
                  </Link>
                  .
                </span>
              </label>
              <label className="flex items-start gap-3 text-sm text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedPrivacy}
                  onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border bg-input text-primary focus:ring-primary/40"
                  required
                />
                <span>
                  I agree to the{' '}
                  <Link
                    href="/privacy"
                    target="_blank"
                    className="text-primary hover:text-violet-700"
                  >
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3 text-red-600">
                <AlertCircle size={18} />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading || !acceptedTerms || !acceptedPrivacy}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href={`/auth/sign-in?redirect=${encodeURIComponent(redirect)}`}
            className="text-primary hover:text-violet-700"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

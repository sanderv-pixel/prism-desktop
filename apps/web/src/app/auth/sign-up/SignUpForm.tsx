'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import { TurnstileWidget } from '@/components/TurnstileWidget'
import { TURNSTILE_ENABLED } from '@/lib/turnstile-config'
import { AlertCircle, CheckCircle2, Mail, Lock } from 'lucide-react'

const TURNSTILE_SITE_KEY = TURNSTILE_ENABLED ? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY : undefined

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
  const [captchaKey, setCaptchaKey] = useState(0)
  const captchaAttempts = useRef(0)

  // Turnstile is best-effort. If the widget races or fails to load (common with ad
  // blockers, privacy extensions, or flaky networks), remount it a couple of times,
  // then fall back to letting the user continue. The server accepts token-less
  // signups under a strict per-IP limit with mandatory email confirmation, so a
  // blocked widget never dead-ends a real user.
  function escalateCaptcha() {
    setCaptchaToken(null)
    if (captchaAttempts.current < 2) {
      captchaAttempts.current += 1
      setCaptchaState('loading')
      setCaptchaKey((k) => k + 1) // remount: re-inject the Turnstile script
    } else {
      setCaptchaState('error') // give up gracefully; best-effort submit allowed
    }
  }

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || captchaState !== 'loading') return
    const t = setTimeout(() => escalateCaptcha(), 12000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captchaState, captchaKey])

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

    // Best-effort captcha: submit with a token if we have one; if the widget gave up
    // (error state), proceed without it. Only hold the user while it is still loading.
    if (TURNSTILE_SITE_KEY && !captchaToken && captchaState !== 'error') {
      setError('Verification is still loading. Please wait a moment, then try again.')
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
          captchaToken: captchaToken ?? undefined,
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
    <div className="v2authwrap">
      <div className="v2card">
        <p className="v2kicker">Get started</p>
        <h1 className="v2title">Create your Prism account</h1>
        <p className="v2sub">
          One account for both creator earnings and advertiser campaigns.
        </p>

        {success ? (
          <div className="v2alert ok">
            <CheckCircle2 size={32} />
            <p style={{ fontSize: 16, fontWeight: 600, color: '#a7f3d0' }}>
              Check your email
            </p>
            <p>We sent a confirmation link to {email}.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
            <div className="v2field">
              <label>Email</label>
              <div className="v2inputwrap">
                <span className="ic">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="v2input"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="v2field">
              <label>Password</label>
              <div className="v2inputwrap">
                <span className="ic">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="v2input"
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
              <div className="v2field">
                <div className="v2turnstile">
                  {captchaState !== 'error' ? (
                    <TurnstileWidget
                      key={captchaKey}
                      ref={turnstileRef}
                      siteKey={TURNSTILE_SITE_KEY}
                      action="turnstile-spin-v1"
                      onLoad={() => setCaptchaState('loading')}
                      onSuccess={(token) => {
                        captchaAttempts.current = 0
                        setCaptchaToken(token)
                        setCaptchaState('ready')
                      }}
                      onError={escalateCaptcha}
                      onExpire={() => {
                        setCaptchaToken(null)
                        setCaptchaState('loading')
                      }}
                    />
                  ) : (
                    <div className="v2hint" style={{ width: '100%' }}>
                      Verification could not load (often an ad blocker or privacy
                      extension). You can still create your account; we confirm it by
                      email.{' '}
                      <button
                        type="button"
                        onClick={() => {
                          captchaAttempts.current = 0
                          setCaptchaState('loading')
                          setCaptchaKey((k) => k + 1)
                        }}
                        style={{ textDecoration: 'underline', background: 'none', border: 0, padding: 0, cursor: 'pointer', color: 'inherit' }}
                      >
                        Try verification again
                      </button>
                    </div>
                  )}
                </div>
                {captchaState === 'loading' && !captchaToken && (
                  <p className="v2hint">Loading verification…</p>
                )}
              </div>
            )}

            <label className="v2check">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                required
              />
              <span>
                I agree to the{' '}
                <Link href="/terms" target="_blank">
                  Terms of Service
                </Link>
                .
              </span>
            </label>
            <label className="v2check">
              <input
                type="checkbox"
                checked={acceptedPrivacy}
                onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                required
              />
              <span>
                I agree to the{' '}
                <Link href="/privacy" target="_blank">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            {error && (
              <div className="v2alert err" style={{ marginTop: 18 }}>
                <AlertCircle size={18} />
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-p btn-full"
              style={{ marginTop: 8 }}
              disabled={loading || !acceptedTerms || !acceptedPrivacy}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        )}

        <p className="v2formlink">
          Already have an account?{' '}
          <Link href={`/auth/sign-in?redirect=${encodeURIComponent(redirect)}`}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

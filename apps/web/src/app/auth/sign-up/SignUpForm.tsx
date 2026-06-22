'use client'

import { useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import { TurnstileWidget } from '@/components/TurnstileWidget'
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
                    <div className="v2alert err" style={{ width: '100%', marginBottom: 0 }}>
                      CAPTCHA could not load. Please disable any ad blockers or
                      privacy extensions and refresh the page.
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

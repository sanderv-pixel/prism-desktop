'use client'

import { useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import { TurnstileWidget } from '@/components/TurnstileWidget'
import { TURNSTILE_ENABLED } from '@/lib/turnstile-config'
import { createClient } from '@/utils/supabase/client'
import { AlertCircle, Mail, Lock } from 'lucide-react'

const TURNSTILE_SITE_KEY = TURNSTILE_ENABLED ? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY : undefined

export function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/dashboard'
  const adminRequired = searchParams.get('admin_required') === '1'

  const DEMO_EMAIL = 'demo@goprism.dev'
  const DEMO_PASSWORD = 'demopassword123'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaState, setCaptchaState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const turnstileRef = useRef<TurnstileInstance>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (honeypot) {
      setError('Invalid email or password')
      setLoading(false)
      return
    }

    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setError(
        captchaState === 'error'
          ? 'CAPTCHA could not load. Try refreshing the page or disabling ad blockers.'
          : 'Please complete the CAPTCHA verification.'
      )
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, captchaToken, honeypot }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error ?? 'Sign-in failed')
      }

      router.push(redirect)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
      turnstileRef.current?.reset()
      setCaptchaToken(null)
      setCaptchaState('loading')
      setLoading(false)
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
  }

  async function handleDemoLogin() {
    setLoading(true)
    setError('')

    try {
      const setupRes = await fetch('/api/auth/demo', { method: 'POST' })
      const setupJson = await setupRes.json()
      if (!setupRes.ok) {
        throw new Error(setupJson.error ?? 'Demo setup failed')
      }

      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
          captchaToken: 'demo',
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error ?? 'Demo sign-in failed')
      }

      router.push(redirect)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo login failed')
      setLoading(false)
    }
  }

  return (
    <div className="v2authwrap">
      <div className="v2card">
        <p className="v2kicker">Welcome back</p>
        <h1 className="v2title">
          {adminRequired ? 'Admin sign-in required' : 'Sign in to Prism'}
        </h1>
        <p className="v2sub">
          {adminRequired
            ? 'This area is restricted to accounts in the admin allow-list.'
            : 'Access your creator and advertiser dashboards.'}
        </p>

        {adminRequired && (
          <div className="v2alert warn">
            <AlertCircle size={18} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <p style={{ fontWeight: 600 }}>Admin access only</p>
              <p>
                Make sure the signed-in email is listed in{' '}
                <code>PRISM_ADMIN_EMAILS</code> and that{' '}
                <code>PRISM_ADMIN_SECRET</code> is set in the deployed
                environment.
              </p>
              <button type="button" onClick={handleSignOut} className="v2linkbtn">
                Sign out and try another account
              </button>
            </div>
          </div>
        )}

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
            <div className="v2turnstile">
              {captchaState !== 'error' ? (
                <TurnstileWidget
                  ref={turnstileRef}
                  siteKey={TURNSTILE_SITE_KEY}
                  action="signin-submit"
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
          )}

          {error && (
            <div className="v2alert err">
              <AlertCircle size={18} />
              <p>{error}</p>
            </div>
          )}

          <button type="submit" className="btn btn-p btn-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {process.env.NODE_ENV !== 'production' && (
          <div className="v2divider">
            <button
              type="button"
              className="btn btn-g btn-full"
              disabled={loading}
              onClick={handleDemoLogin}
            >
              {loading ? 'Signing in…' : 'Try demo account'}
            </button>
            <p className="v2hint">
              Creates a local demo user so you can preview the dashboards.
            </p>
          </div>
        )}

        <p className="v2formlink">
          Don&apos;t have an account?{' '}
          <Link href={`/auth/sign-up?redirect=${encodeURIComponent(redirect)}`}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

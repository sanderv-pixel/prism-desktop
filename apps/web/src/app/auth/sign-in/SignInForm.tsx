'use client'

import { useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import { TurnstileWidget } from '@/components/TurnstileWidget'
import { Button } from '@/components/Button'
import { createClient } from '@/utils/supabase/client'
import { AlertCircle, Mail, Lock } from 'lucide-react'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

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
    <div className="min-h-screen flex items-center justify-center px-4 py-24 bg-muted/30">
      <div className="w-full max-w-md rounded-2xl card p-8">
        <p className="eyebrow mb-3">Welcome back</p>
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          {adminRequired ? 'Admin sign-in required' : 'Sign in to Prism'}
        </h1>
        <p className="text-muted-foreground mb-8">
          {adminRequired
            ? 'This area is restricted to accounts in the admin allow-list.'
            : 'Access your creator and advertiser dashboards.'}
        </p>

        {adminRequired && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3 text-amber-700 mb-6">
            <AlertCircle size={18} />
            <div className="text-sm space-y-1">
              <p className="font-medium">Admin access only</p>
              <p>
                Make sure the signed-in email is listed in{' '}
                <code className="bg-amber-100 px-1 rounded">PRISM_ADMIN_EMAILS</code> and
                that <code className="bg-amber-100 px-1 rounded">PRISM_ADMIN_SECRET</code> is
                set in the deployed environment.
              </p>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-primary hover:underline font-medium"
              >
                Sign out and try another account
              </button>
            </div>
          </div>
        )}

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
            <div className="flex justify-center min-h-[65px]">
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
                <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600 text-center w-full">
                  CAPTCHA could not load. Please disable any ad blockers or privacy extensions and refresh the page.
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3 text-red-600">
              <AlertCircle size={18} />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        {process.env.NODE_ENV !== 'production' && (
          <div className="mt-4 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              disabled={loading}
              onClick={handleDemoLogin}
            >
              {loading ? 'Signing in…' : 'Try demo account'}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Creates a local demo user so you can preview the dashboards.
            </p>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link
            href={`/auth/sign-up?redirect=${encodeURIComponent(redirect)}`}
            className="text-primary hover:text-violet-700"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

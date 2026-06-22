'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/Button'
import '@/components/dashboard/dashboard-dark.css'

export default function AdvertiserOnboardingPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/advertisers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          website,
          email: user?.email,
          acceptedTerms,
          acceptedPrivacy,
        }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error ?? 'Failed to create advertiser')
      }

      toast.success('Advertiser account created. Redirecting to your dashboard…')
      router.push('/advertiser/dashboard')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="dash-dark min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <section className="dash-dark section-padding min-h-screen">
      <div className="container-tight max-w-xl">
        <div className="card rounded-2xl p-8 md:p-10 hover:shadow-md transition">
          <span className="eyebrow mb-4">Advertiser onboarding</span>
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Create your advertiser account
          </h1>
          <p className="text-muted-foreground mb-8">
            Companies, recruiters, and job seekers can all run campaigns on Prism.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                Name or brand
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                placeholder="Acme DevTools or Jane Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                Website or portfolio
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                placeholder="https://acme.com or https://jane.dev"
              />
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-3 text-sm text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border bg-input text-primary focus:ring-primary/40"
                  required
                />
                <span>
                  I agree to the advertiser{' '}
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
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading || !acceptedTerms || !acceptedPrivacy}
            >
              {loading ? 'Creating…' : 'Create advertiser account'}
            </Button>
          </form>
        </div>
      </div>
    </section>
  )
}

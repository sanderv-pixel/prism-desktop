'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { DashboardShellV2 } from '@/components/dashboard-v2/DashboardShellV2'
import { earnerNav } from '@/components/dashboard-v2/earnerNav'
import { Button } from '@/components/Button'
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'

type LinkStatus = 'loading' | 'idle' | 'success' | 'error'

export default function ConnectDeviceForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const userName = user?.email ? user.email.split('@')[0] : 'creator'
  const userEmail = user?.email ?? ''
  const userId = searchParams.get('userId')

  const [status, setStatus] = useState<LinkStatus>('idle')
  const [error, setError] = useState('')
  const [identities, setIdentities] = useState<string[]>([])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      const returnUrl = `/dashboard/connect?userId=${encodeURIComponent(userId ?? '')}`
      router.replace(`/auth/sign-in?redirect=${encodeURIComponent(returnUrl)}`)
      return
    }
    if (!userId) {
      setStatus('error')
      setError('No device ID provided. Open this page from the Prism extension.')
      return
    }
    linkDevice(userId)
  }, [authLoading, user, userId, router])

  async function linkDevice(anonymousUserId: string) {
    setStatus('loading')
    setError('')
    try {
      const res = await fetch('/api/builder/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anonymousUserId }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error ?? 'Failed to link device')
      }
      setStatus('success')
      await fetchIdentities()
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to link device')
    }
  }

  async function fetchIdentities() {
    try {
      const res = await fetch('/api/builder/identity')
      if (res.ok) {
        const json = await res.json()
        setIdentities(json.identities ?? [])
      }
    } catch {
      // ignore
    }
  }

  if (authLoading || (!user && !error)) {
    return (
      <DashboardShellV2 view="earn" title="Connect a device" subtitle="Pair the Prism overlay with your account." nav={earnerNav('devices')} userName={userName} userEmail={userEmail}>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      </DashboardShellV2>
    )
  }

  return (
    <DashboardShellV2 view="earn" title="Connect a device" subtitle="Pair the Prism overlay with your account." nav={earnerNav('devices')} userName={userName} userEmail={userEmail}>
      <div className="max-w-xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back to dashboard
        </Link>

        <div className="card rounded-2xl p-8 md:p-10">
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Connect your device
          </h1>
          <p className="text-muted-foreground mb-6">
            Link this Cursor/VS Code instance to your Prism account so impressions
            and clicks count toward your earnings.
          </p>

          {status === 'loading' && (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 size={20} className="animate-spin text-primary" />
              <span>Linking device…</span>
            </div>
          )}

          {status === 'success' && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 text-emerald-700 flex items-start gap-3">
              <CheckCircle2 size={22} />
              <div>
                <p className="font-medium">Device linked successfully</p>
                <p className="text-sm opacity-80 mt-1">
                  Your extension is now connected to this account. Earnings will
                  appear on your dashboard.
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-5 text-red-700 flex items-start gap-3">
              <AlertCircle size={22} />
              <div>
                <p className="font-medium">Could not link device</p>
                <p className="text-sm opacity-80 mt-1">{error}</p>
                {error.includes('verified activity') && (
                  <p className="text-sm opacity-80 mt-2">
                    Use the extension and let an ad impression complete, then try
                    again.
                  </p>
                )}
              </div>
            </div>
          )}

          {identities.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-medium text-foreground mb-3">
                Linked devices ({identities.length})
              </h2>
              <ul className="space-y-2">
                {identities.map((id) => (
                  <li
                    key={id}
                    className="text-xs font-mono bg-muted rounded-lg px-3 py-2 break-all"
                  >
                    {id}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 flex gap-3">
            <Button href="/dashboard">Go to dashboard</Button>
            {status === 'error' && userId && (
              <Button variant="outline" onClick={() => linkDevice(userId)}>
                Try again
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardShellV2>
  )
}

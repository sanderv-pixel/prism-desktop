'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Button } from '@/components/Button'
import { ArrowLeft, Wallet, AlertTriangle } from 'lucide-react'

interface Settings {
  email: string
  payoutProvider: string | null
  kycStatus: string | null
  payoutsEnabled: boolean
  notifyPayout: boolean
  notifyProduct: boolean
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`relative w-10 h-6 rounded-full transition ${on ? 'bg-violet-600' : 'bg-muted'}`}
      aria-pressed={on}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition ${on ? 'translate-x-4' : ''}`} />
    </button>
  )
}

export default function CreatorSettingsPage() {
  const router = useRouter()
  const [s, setS] = useState<Settings | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch('/api/dashboard/settings')
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(setS)
      .catch(() => toast.error('Could not load settings'))
  }, [])

  function toggleNotify(key: 'notifyPayout' | 'notifyProduct', value: boolean) {
    if (!s) return
    setS({ ...s, [key]: value })
    fetch('/api/dashboard/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    }).then((r) => (r.ok ? toast.success('Preferences saved') : toast.error('Could not save')))
  }

  async function disconnectAll() {
    if (!confirm('Disconnect all devices? Every overlay stops earning until it re-pairs.')) return
    setBusy(true)
    const res = await fetch('/api/dashboard/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    setBusy(false)
    if (res.ok) toast.success('All devices disconnected')
    else toast.error('Could not disconnect devices')
  }

  if (!s) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-96 text-muted-foreground">Loading…</div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <button
        onClick={() => router.push('/dashboard')}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft size={16} /> Back to dashboard
      </button>

      <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-8">Settings</h1>

      <div className="max-w-2xl space-y-6">
        <section className="rounded-xl border bg-card p-6">
          <h2 className="font-medium mb-4">Account</h2>
          <div>
            <span className="text-sm text-muted-foreground">Email</span>
            <p className="mt-1 text-foreground/80">{s.email}</p>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-medium">Payout method</h2>
              <p className="text-sm text-muted-foreground">
                {s.payoutProvider
                  ? `${s.payoutProvider} · ${s.payoutsEnabled ? 'verified' : s.kycStatus || 'pending verification'}`
                  : 'Not set up yet'}
              </p>
            </div>
            <Button variant="outline" size="md" href="/dashboard/payout-method">
              <Wallet size={15} className="mr-2" /> {s.payoutProvider ? 'Manage' : 'Set up'}
            </Button>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-6">
          <h2 className="font-medium mb-1">Email notifications</h2>
          <p className="text-sm text-muted-foreground mb-4">Choose which emails Prism sends you.</p>
          <div className="divide-y divide-border">
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm text-foreground">Payout updates</p>
                <p className="text-xs text-muted-foreground">When a withdrawal is requested or paid.</p>
              </div>
              <Toggle on={s.notifyPayout} onChange={(v) => toggleNotify('notifyPayout', v)} />
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm text-foreground">Product updates</p>
                <p className="text-xs text-muted-foreground">Occasional news about new features.</p>
              </div>
              <Toggle on={s.notifyProduct} onChange={(v) => toggleNotify('notifyProduct', v)} />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-red-200 bg-red-50/30 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={17} className="text-red-500" />
            <h2 className="font-medium text-red-800">Danger zone</h2>
          </div>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm text-foreground">Disconnect all devices</p>
              <p className="text-xs text-muted-foreground">
                Revokes every overlay key. You can re-pair any device afterward.
              </p>
            </div>
            <button
              onClick={disconnectAll}
              disabled={busy}
              className="rounded-lg border border-red-300 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
            >
              Disconnect all
            </button>
          </div>
        </section>
      </div>
    </DashboardShell>
  )
}

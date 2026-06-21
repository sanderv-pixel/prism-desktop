'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Button } from '@/components/Button'
import { ArrowLeft, CreditCard, Crosshair } from 'lucide-react'

interface Settings {
  name: string
  email: string
  website: string | null
  notifyBudget: boolean
  notifyLowBalance: boolean
  notifyCampaignStatus: boolean
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`relative w-10 h-6 rounded-full transition ${on ? 'bg-violet-600' : 'bg-muted'}`}
      aria-pressed={on}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition ${on ? 'translate-x-4' : ''}`}
      />
    </button>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const [s, setS] = useState<Settings | null>(null)
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  useEffect(() => {
    fetch('/api/advertiser/settings')
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d: Settings) => {
        setS(d)
        setName(d.name ?? '')
        setWebsite(d.website ?? '')
      })
      .catch(() => toast.error('Could not load settings'))
  }, [])

  async function patch(body: Record<string, unknown>, ok = 'Saved') {
    const res = await fetch('/api/advertiser/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) toast.success(ok)
    else toast.error((await res.json().catch(() => ({}))).error ?? 'Could not save')
    return res.ok
  }

  async function saveProfile() {
    setSavingProfile(true)
    await patch({ name, website: website || null }, 'Profile saved')
    setSavingProfile(false)
  }

  function toggleNotify(key: keyof Settings, value: boolean) {
    if (!s) return
    setS({ ...s, [key]: value })
    const map: Record<string, string> = {
      notifyBudget: 'notifyBudget',
      notifyLowBalance: 'notifyLowBalance',
      notifyCampaignStatus: 'notifyCampaignStatus',
    }
    patch({ [map[key]]: value }, 'Preferences saved')
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
        onClick={() => router.push('/advertiser/dashboard')}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft size={16} /> Back to dashboard
      </button>

      <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-8">Settings</h1>

      <div className="max-w-2xl space-y-6">
        <section className="rounded-xl border bg-card p-6">
          <h2 className="font-medium mb-4">Profile</h2>
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm text-muted-foreground">Business name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </label>
            <label className="block">
              <span className="text-sm text-muted-foreground">Website</span>
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </label>
            <div>
              <span className="text-sm text-muted-foreground">Email</span>
              <p className="mt-1 text-foreground/80">{s.email}</p>
            </div>
            <Button type="button" size="md" onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? 'Saving…' : 'Save profile'}
            </Button>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-6">
          <h2 className="font-medium mb-1">Email notifications</h2>
          <p className="text-sm text-muted-foreground mb-4">Choose which alerts Prism sends you.</p>
          <div className="divide-y divide-border">
            {([
              ['notifyLowBalance', 'Low balance', 'When your wallet is running low.'],
              ['notifyBudget', 'Budget exhausted', "When a campaign reaches its budget cap."],
              ['notifyCampaignStatus', 'Campaign status', 'When a campaign goes live or is reviewed.'],
            ] as const).map(([key, title, desc]) => (
              <div key={key} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Toggle on={s[key] as boolean} onChange={(v) => toggleNotify(key, v)} />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-6">
          <h2 className="font-medium mb-4">Billing &amp; tracking</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <a
              href="/advertiser/billing"
              className="flex items-center gap-3 rounded-lg border border-border p-4 hover:bg-muted transition"
            >
              <CreditCard size={18} className="text-muted-foreground" />
              <div>
                <p className="text-sm text-foreground">Billing &amp; auto-recharge</p>
                <p className="text-xs text-muted-foreground">Payments, receipts, auto top-up</p>
              </div>
            </a>
            <a
              href="/advertiser/conversions"
              className="flex items-center gap-3 rounded-lg border border-border p-4 hover:bg-muted transition"
            >
              <Crosshair size={18} className="text-muted-foreground" />
              <div>
                <p className="text-sm text-foreground">Conversion tracking</p>
                <p className="text-xs text-muted-foreground">Postback key + setup</p>
              </div>
            </a>
          </div>
        </section>
      </div>
    </DashboardShell>
  )
}

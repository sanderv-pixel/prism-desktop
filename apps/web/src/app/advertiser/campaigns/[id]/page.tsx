'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { DashboardShellV2 } from '@/components/dashboard-v2/DashboardShellV2'
import { advertiserNav } from '@/components/dashboard-v2/advertiserNav'
import { Button } from '@/components/Button'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Pause,
  Play,
  Trash2,
} from 'lucide-react'
import { IconUpload } from '@/components/IconUpload'
import { AdPreview } from '@/components/AdPreview'
import { CampaignCreatives } from '@/components/advertiser/CampaignCreatives'
import { CountryTargeting } from '@/components/advertiser/CountryTargeting'
import { ContextTargeting } from '@/components/advertiser/ContextTargeting'

interface Campaign {
  id: string
  title: string
  copy: string
  brand_name: string | null
  url: string
  icon_url: string | null
  budget_cents: number
  spent_cents: number
  max_bid_cpm: number
  max_bid_cpc: number | null
  bid_type: string
  daily_budget_cents: number | null
  frequency_cap: number | null
  frequency_window_hours: number | null
  status: string
  contexts: string[]
  target_countries?: string[] | null
  created_at: string
}

export default function EditCampaignPage() {
  const router = useRouter()
  const params = useParams()
  const { user, loading: authLoading } = useAuth()
  const userName = user?.email ? user.email.split('@')[0] : 'advertiser'
  const userEmail = user?.email ?? ''
  const id = params.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [title, setTitle] = useState('')
  const [copy, setCopy] = useState('')
  const [brandName, setBrandName] = useState('')
  const [url, setUrl] = useState('')
  const [iconUrl, setIconUrl] = useState('')
  const [contexts, setContexts] = useState<string[]>([])
  const [broadReach, setBroadReach] = useState(false)
  const [targetSources, setTargetSources] = useState<string[]>([])
  const [targetCountries, setTargetCountries] = useState<string[]>([])
  const [maxBidCpm, setMaxBidCpm] = useState('12')
  const [maxBidCpc, setMaxBidCpc] = useState('0.50')
  const [dailyBudget, setDailyBudget] = useState('')
  const [frequencyCap, setFrequencyCap] = useState('')
  const [frequencyWindow, setFrequencyWindow] = useState('24')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [iconError, setIconError] = useState('')
  const [success, setSuccess] = useState(false)

  async function fetchCampaign() {
    try {
      const res = await fetch(`/api/campaigns/${id}`)
      if (!res.ok) throw new Error('Campaign not found')
      const data = await res.json()
      setCampaign(data)
      setTitle(data.title)
      setCopy(data.copy)
      setBrandName(data.brand_name ?? '')
      setUrl(data.url)
      setIconUrl(data.icon_url ?? '')
      setContexts(data.contexts ?? [])
      setBroadReach((data.contexts ?? []).length === 0)
      setTargetSources(data.target_sources ?? [])
      setTargetCountries(data.target_countries ?? [])
      setMaxBidCpm(((data.max_bid_cpm ?? 1200) / 100).toString())
      setMaxBidCpc(((data.max_bid_cpc ?? 50) / 100).toString())
      setDailyBudget(data.daily_budget_cents ? (data.daily_budget_cents / 100).toString() : '')
      setFrequencyCap(data.frequency_cap ? data.frequency_cap.toString() : '')
      setFrequencyWindow(data.frequency_window_hours ? data.frequency_window_hours.toString() : '24')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCampaign()
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const body: Record<string, unknown> = {
        title,
        copy,
        brand_name: brandName.trim(),
        url,
        icon_url: iconUrl || null,
        contexts,
        target_sources: targetSources.length > 0 ? targetSources : null,
        target_countries: targetCountries.length > 0 ? targetCountries : null,
      }

      // The pricing model is fixed at creation; only edit the relevant bid amount.
      if (campaign?.bid_type === 'cpc') {
        body.max_bid_cpc = Math.round(parseFloat(maxBidCpc) * 100)
      } else {
        body.max_bid_cpm = Math.round(parseFloat(maxBidCpm) * 100)
      }

      if (dailyBudget) body.daily_budget_cents = Math.round(parseFloat(dailyBudget) * 100)
      if (frequencyCap) {
        body.frequency_cap = parseInt(frequencyCap, 10)
        body.frequency_window_hours = parseInt(frequencyWindow, 10)
      }

      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Failed to update campaign')
      setSuccess(true)
      toast.success('Campaign saved.')
      setTimeout(() => setSuccess(false), 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(status: string, label: string) {
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Failed to update status')
      await fetchCampaign()
      toast.success(label)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Status update failed'
      setError(message)
      toast.error(message)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete “${title}”? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Failed to delete campaign')
      toast.success('Campaign deleted.')
      router.push('/advertiser/dashboard')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed'
      setError(message)
      toast.error(message)
      setDeleting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <DashboardShellV2 view="adv" title="Edit campaign" subtitle="Update creative, budget, and targeting." nav={advertiserNav('campaigns')} userName={userName} userEmail={userEmail}>
        <div className="flex items-center justify-center h-96 text-muted-foreground">
          Loading campaign…
        </div>
      </DashboardShellV2>
    )
  }

  if (error || !campaign) {
    return (
      <DashboardShellV2 view="adv" title="Edit campaign" subtitle="Update creative, budget, and targeting." nav={advertiserNav('campaigns')} userName={userName} userEmail={userEmail}>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-600 flex items-start gap-3">
          <AlertCircle size={20} />
          <div>
            <p className="font-medium">{error}</p>
          </div>
        </div>
      </DashboardShellV2>
    )
  }

  const progress =
    campaign.budget_cents > 0
      ? Math.min((campaign.spent_cents / campaign.budget_cents) * 100, 100)
      : 0

  return (
    <DashboardShellV2 view="adv" title="Edit campaign" subtitle="Update creative, budget, and targeting." nav={advertiserNav('campaigns')} userName={userName} userEmail={userEmail}>
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" href="/advertiser/dashboard" className="mb-6">
          <ArrowLeft size={16} className="mr-2" />
          Back to dashboard
        </Button>

        <div className="rounded-2xl card p-6 md:p-8 hover:shadow-md transition">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <p className="eyebrow mb-2">Edit campaign</p>
              <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
                {campaign.title}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={campaign.status} />
              {campaign.status === 'active' && (
                <button
                  onClick={() => handleStatusChange('paused', 'Campaign paused.')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-foreground/80 hover:bg-muted text-xs font-medium transition"
                >
                  <Pause size={14} />
                  Pause
                </button>
              )}
              {campaign.status === 'paused' && (
                <button
                  onClick={() => handleStatusChange('pending_review', 'Campaign submitted for review.')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-emerald-600 hover:bg-emerald-50 text-xs font-medium transition"
                >
                  <Play size={14} />
                  Submit for review
                </button>
              )}
            </div>
          </div>

          {/* Spend progress */}
          <div className="rounded-xl bg-muted/50 border border-border p-4 mb-8">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Spend</span>
              <span className="text-foreground font-medium">
                ${(campaign.spent_cents / 100).toFixed(2)} / $
                {(campaign.budget_cents / 100).toFixed(2)}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-cyan-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Created {new Date(campaign.created_at).toLocaleDateString()}
            </p>
          </div>

          {success && (
            <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3 text-emerald-800">
              <CheckCircle2 size={18} />
              <p className="text-sm">Campaign updated successfully</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                Campaign name
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                Ad copy
              </label>
              <input
                type="text"
                required
                maxLength={40}
                value={copy}
                onChange={(e) => setCopy(e.target.value)}
                placeholder="Ship faster →"
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                One short action + optional arrow, ≤40 characters ({copy.length}/40).
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                Brand name <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                type="text"
                maxLength={14}
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Brand name (leave blank to show none)"
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Brand name only, ≤14 characters. Leave empty to show just your icon and copy.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                Destination URL
              </label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                  Icon
                </label>
                <IconUpload
                  value={iconUrl || null}
                  onChange={(value) => setIconUrl(value ?? '')}
                  onError={setIconError}
                  error={iconError}
                />
              </div>
              <AdPreview copy={copy} url={url} iconUrl={iconUrl || null} brandName={brandName} />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-3">
                Contextual targeting
              </label>
              <ContextTargeting
                value={contexts}
                onChange={setContexts}
                broadReach={broadReach}
                onBroadReachChange={setBroadReach}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">Surfaces</label>
              <p className="text-xs text-muted-foreground mb-3">
                Restrict delivery to specific AI tools. Leave empty to target all surfaces.
              </p>
              <div className="flex flex-wrap gap-2">
                {(['claude', 'cursor', 'codex', 'terminal'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      setTargetSources((prev) =>
                        prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                      )
                    }
                    className={`text-xs px-3 py-1.5 rounded-full border capitalize transition ${
                      targetSources.includes(s)
                        ? 'bg-violet-50 border-violet-200 text-primary'
                        : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <CountryTargeting value={targetCountries} onChange={setTargetCountries} />

            <div className="grid sm:grid-cols-2 gap-5">
              {campaign?.bid_type === 'cpc' ? (
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                    Max CPC bid (USD per click)
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.05"
                    value={maxBidCpc}
                    onChange={(e) => setMaxBidCpc(e.target.value)}
                    className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    You only pay per click. Ranked by effective CPM (bid x predicted CTR).
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                    Max CPM bid (USD)
                  </label>
                  <input
                    type="number"
                    required
                    min="8"
                    step="0.5"
                    value={maxBidCpm}
                    onChange={(e) => setMaxBidCpm(e.target.value)}
                    className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">Floor $8, typical $8–$25</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                  Daily budget (USD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                Frequency cap
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={frequencyCap}
                  onChange={(e) => setFrequencyCap(e.target.value)}
                  placeholder="Impressions"
                  className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
                <select
                  value={frequencyWindow}
                  onChange={(e) => setFrequencyWindow(e.target.value)}
                  className="rounded-lg border border-border bg-input px-3 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                >
                  <option value="1">per hour</option>
                  <option value="24">per day</option>
                  <option value="168">per week</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3 text-red-600">
                <AlertCircle size={18} />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-border">
              <div className="flex items-center gap-3">
                <Button type="submit" size="lg" disabled={saving || (!broadReach && contexts.length === 0)}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  href="/advertiser/dashboard"
                >
                  Cancel
                </Button>
              </div>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 transition disabled:opacity-50"
              >
                <Trash2 size={16} />
                {deleting ? 'Deleting…' : 'Delete campaign'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <CampaignCreatives campaignId={id} />
          </div>
        </div>
      </div>
    </DashboardShellV2>
  )
}

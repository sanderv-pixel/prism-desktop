'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { DashboardShellV2 } from '@/components/dashboard-v2/DashboardShellV2'
import { advertiserNav } from '@/components/dashboard-v2/advertiserNav'
import { Button } from '@/components/Button'
import { ArrowLeft, AlertCircle, CheckCircle2, Wallet } from 'lucide-react'
import { CONTEXT_OPTIONS, PRESETS } from '@/lib/campaign-contexts'
import { MarketContextPanel } from '@/components/MarketContextPanel'
import { IconUpload } from '@/components/IconUpload'
import { AdPreview } from '@/components/AdPreview'
import { AddFundsModal } from '@/components/advertiser/AddFundsModal'

interface Advertiser {
  id: string
  status: string
  balance_cents: number
}

export default function NewCampaignPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const userName = user?.email ? user.email.split('@')[0] : 'advertiser'
  const userEmail = user?.email ?? ''
  const [title, setTitle] = useState('')
  const [copy, setCopy] = useState('')
  const [brandName, setBrandName] = useState('')
  const [url, setUrl] = useState('')
  const [iconUrl, setIconUrl] = useState('')
  const [objective, setObjective] = useState<'awareness' | 'traffic' | 'performance'>('awareness')
  const [budget, setBudget] = useState('10')
  const [dailyBudget, setDailyBudget] = useState('')
  const [maxBidCpm, setMaxBidCpm] = useState('12')
  const [maxBidCpc, setMaxBidCpc] = useState('0.50')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [frequencyCap, setFrequencyCap] = useState('')
  const [frequencyWindow, setFrequencyWindow] = useState('24')
  const [contexts, setContexts] = useState<string[]>(['chatgpt', 'general', 'productivity'])
  const [targetSources, setTargetSources] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [iconError, setIconError] = useState('')
  const [success, setSuccess] = useState(false)
  const [advertiser, setAdvertiser] = useState<Advertiser | null>(null)
  const [showAddFunds, setShowAddFunds] = useState(false)

  const loadAdvertiser = useCallback(async () => {
    try {
      const res = await fetch('/api/advertisers')
      if (!res.ok) {
        if (res.status === 404) {
          router.push('/advertiser/onboarding')
          return
        }
        throw new Error('Failed to load advertiser')
      }
      const data = await res.json()
      setAdvertiser({
        id: data.id,
        status: data.status,
        balance_cents: data.balance_cents ?? 0,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load advertiser'
      setError(message)
      toast.error(message)
    }
  }, [router])

  useEffect(() => {
    if (!authLoading) loadAdvertiser()
  }, [authLoading, loadAdvertiser])

  // Refresh the balance when the tab regains focus, so a top-up made elsewhere
  // (billing page, another tab) clears the gate without a manual reload.
  useEffect(() => {
    const onFocus = () => { if (!authLoading) loadAdvertiser() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [authLoading, loadAdvertiser])

  const budgetCents = Math.round(parseFloat(budget || '0') * 100)
  const balanceCents = advertiser?.balance_cents ?? 0
  const budgetValid = budgetCents >= 1000
  const fundsOk = advertiser?.status === 'active' && balanceCents >= budgetCents
  const canAfford = budgetValid && fundsOk

  if (authLoading) {
    return (
      <DashboardShellV2 view="adv" title="New campaign" subtitle="Launch a new campaign." nav={advertiserNav('campaigns')} userName={userName} userEmail={userEmail}>
        <div className="flex items-center justify-center h-96 text-muted-foreground">
          Loading…
        </div>
      </DashboardShellV2>
    )
  }

  function toggleContext(ctx: string) {
    setContexts((prev) =>
      prev.includes(ctx) ? prev.filter((c) => c !== ctx) : [...prev, ctx]
    )
  }

  function applyPreset(name: keyof typeof PRESETS) {
    setContexts(PRESETS[name])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const bidType = objective === 'awareness' ? 'cpm' : 'cpc'
      const body: Record<string, unknown> = {
        title,
        copy,
        brandName: brandName.trim() || undefined,
        url,
        iconUrl: iconUrl || undefined,
        objective,
        bidType,
        budgetCents: Math.round(parseFloat(budget) * 100),
        contexts,
      }
      if (bidType === 'cpc') body.maxBidCpc = Math.round(parseFloat(maxBidCpc) * 100)
      else body.maxBidCpm = Math.round(parseFloat(maxBidCpm) * 100)

      if (targetSources.length > 0) body.targetSources = targetSources

      if (dailyBudget) body.dailyBudgetCents = Math.round(parseFloat(dailyBudget) * 100)
      if (startDate) body.startDate = new Date(startDate).toISOString()
      if (endDate) body.endDate = new Date(endDate).toISOString()
      if (frequencyCap) {
        body.frequencyCap = parseInt(frequencyCap, 10)
        body.frequencyWindowHours = parseInt(frequencyWindow, 10)
      }

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to create campaign')

      setSuccess(true)
      toast.success('Campaign created. Redirecting to dashboard…')
      setTimeout(() => router.push('/advertiser/dashboard'), 800)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardShellV2 view="adv" title="New campaign" subtitle="Launch a new campaign." nav={advertiserNav('campaigns')} userName={userName} userEmail={userEmail}>
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" href="/advertiser/dashboard" className="mb-6">
          <ArrowLeft size={16} className="mr-2" />
          Back to dashboard
        </Button>

        <div className="rounded-2xl card p-6 md:p-8 hover:shadow-md transition">
          <p className="eyebrow mb-3">New campaign</p>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-2">
            Launch a Prism campaign
          </h1>
          <p className="text-muted-foreground mb-8">
            One line of copy, one destination URL, and the contexts where it should appear.
            Awareness (CPM) and Traffic (CPC) campaigns go live immediately; performance campaigns require review.
          </p>

          {success ? (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-center">
              <CheckCircle2 size={32} className="mx-auto text-emerald-600 mb-3" />
              <p className="text-lg font-medium text-emerald-800">Campaign created</p>
              <p className="text-sm text-emerald-700">Redirecting to dashboard…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                  Campaign objective
                </label>
                <div className="grid sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setObjective('awareness')}
                    className={`rounded-lg border px-4 py-3 text-left transition ${
                      objective === 'awareness'
                        ? 'bg-violet-50 border-violet-200 text-primary'
                        : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="block text-sm font-medium text-foreground">Awareness</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      Pay per impression (CPM). Best for reach.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setObjective('traffic')}
                    className={`rounded-lg border px-4 py-3 text-left transition ${
                      objective === 'traffic'
                        ? 'bg-violet-50 border-violet-200 text-primary'
                        : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="block text-sm font-medium text-foreground">Traffic</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      Pay per click (CPC). Only pay when someone clicks.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setObjective('performance')}
                    className={`rounded-lg border px-4 py-3 text-left transition ${
                      objective === 'performance'
                        ? 'bg-violet-50 border-violet-200 text-primary'
                        : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="block text-sm font-medium text-foreground">Performance</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      Pay per click (CPC). Requires conversion review.
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                  Campaign name
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Railway Launch Week"
                  className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
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
                  placeholder="https://railway.app"
                  className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
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

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-foreground/80">
                      Total budget (USD)
                    </label>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Wallet size={12} />
                      Available: ${(balanceCents / 100).toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="number"
                    required
                    min="10"
                    step="1"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className={`w-full rounded-lg border bg-input px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 ${
                      budgetCents > balanceCents ? 'border-red-300' : 'border-border'
                    }`}
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Minimum $10. The full budget is reserved from your wallet when you create the campaign.
                  </p>
                  {budgetCents > balanceCents && (
                    <p className="text-xs text-red-600 mt-1.5">
                      Budget exceeds your available wallet balance.{' '}
                      <button type="button" onClick={() => setShowAddFunds(true)} className="underline">
                        Top up
                      </button>{' '}
                      to continue.
                    </p>
                  )}
                </div>
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

              <div className="grid sm:grid-cols-2 gap-5">
                {objective === 'awareness' ? (
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                      Max CPM bid (USD per 1,000 impressions)
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
                ) : (
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
                      You only pay when someone clicks. We rank by effective CPM (your bid x predicted CTR).
                    </p>
                  </div>
                )}
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
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                    Start date
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                    End date
                  </label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-foreground/80">
                    Contextual placements
                  </label>
                  <div className="flex flex-wrap justify-end gap-2">
                    {Object.keys(PRESETS).map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => applyPreset(name as keyof typeof PRESETS)}
                        className="text-xs px-2.5 py-1 rounded-md bg-muted text-muted-foreground hover:text-foreground border border-border transition"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {CONTEXT_OPTIONS.map((ctx) => (
                    <button
                      key={ctx}
                      type="button"
                      onClick={() => toggleContext(ctx)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition ${
                        contexts.includes(ctx)
                          ? 'bg-violet-50 border-violet-200 text-primary'
                          : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {ctx}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Select the editors, languages, AI tools, and intents where your ad should be eligible to compete.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Surfaces</label>
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
                <p className="text-xs text-muted-foreground mt-2">
                  Restrict delivery to specific AI tools. Leave empty to target all surfaces.
                </p>
              </div>

              <MarketContextPanel
                contexts={contexts}
                bidCpm={objective === 'awareness' ? parseFloat(maxBidCpm) || 0 : 0}
              />

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3 text-red-600">
                  <AlertCircle size={18} />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                {advertiser && budgetValid && !fundsOk ? (
                  <Button type="button" size="lg" onClick={() => setShowAddFunds(true)}>
                    <Wallet size={16} /> Add funds to continue
                  </Button>
                ) : (
                  <Button type="submit" size="lg" disabled={loading || contexts.length === 0 || !canAfford}>
                    {loading ? 'Creating…' : !advertiser ? 'Loading…' : !budgetValid ? 'Enter a budget (min $10)' : objective === 'performance' ? 'Submit for review' : 'Create campaign'}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  href="/advertiser/dashboard"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      {showAddFunds && (
        <AddFundsModal
          onClose={() => setShowAddFunds(false)}
          onFunded={loadAdvertiser}
        />
      )}
    </DashboardShellV2>
  )
}

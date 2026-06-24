'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { DashboardShellV2 } from '@/components/dashboard-v2/DashboardShellV2'
import { advertiserNav } from '@/components/dashboard-v2/advertiserNav'
import { Button } from '@/components/Button'
import { ArrowLeft, ArrowRight, AlertCircle, CheckCircle2, Wallet, Check } from 'lucide-react'
import { MarketContextPanel } from '@/components/MarketContextPanel'
import { IconUpload } from '@/components/IconUpload'
import { AdPreview } from '@/components/AdPreview'
import { AddFundsModal } from '@/components/advertiser/AddFundsModal'
import { CountryTargeting } from '@/components/advertiser/CountryTargeting'
import { ContextTargeting } from '@/components/advertiser/ContextTargeting'
import { targetingSummary } from '@/lib/countries'

interface Advertiser {
  id: string
  status: string
  balance_cents: number
}

const inputCls =
  'w-full rounded-lg border border-border bg-input px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40'

const STEPS = [
  { label: 'Objective', title: 'What is your goal?', sub: 'Pick how you pay and what we optimize for.' },
  { label: 'Creative', title: 'Build your ad', sub: 'One line of copy, a destination, and an optional brand + icon.' },
  { label: 'Targeting', title: 'Who should see it', sub: 'Contexts, AI tools, and countries where your ad can compete.' },
  { label: 'Budget & schedule', title: 'Budget & schedule', sub: 'Set spend, bids, pacing, and an optional flight window.' },
  { label: 'Review', title: 'Review & launch', sub: 'Double-check everything, then launch.' },
] as const

function Stepper({ step, onJump }: { step: number; onJump: (i: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 26, flexWrap: 'wrap', gap: 6 }}>
      {STEPS.map((s, i) => {
        const done = i < step
        const active = i === step
        return (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : '0 1 auto', minWidth: 0 }}>
            <button
              type="button"
              onClick={() => i <= step && onJump(i)}
              disabled={i > step}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: 0, cursor: i <= step ? 'pointer' : 'default', minWidth: 0 }}
            >
              <span
                style={{
                  width: 28, height: 28, borderRadius: '50%', flex: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600,
                  background: active ? '#8b5cf6' : done ? 'rgba(52,211,153,.16)' : 'rgba(255,255,255,.05)',
                  color: active ? '#fff' : done ? '#6ee7b7' : 'var(--mut, #6a7080)',
                  border: active ? 'none' : '1px solid var(--line, rgba(255,255,255,.1))',
                }}
              >
                {done ? <Check size={15} /> : i + 1}
              </span>
              <span style={{ fontSize: 13, fontWeight: active ? 600 : 500, color: active ? '#fff' : done ? 'var(--txt, #aeb4c2)' : 'var(--mut, #6a7080)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {s.label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 1, background: done ? 'rgba(52,211,153,.3)' : 'var(--line, rgba(255,255,255,.1))', margin: '0 10px', minWidth: 12 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground text-right">{children}</span>
    </div>
  )
}

export default function NewCampaignPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const userName = user?.email ? user.email.split('@')[0] : 'advertiser'
  const userEmail = user?.email ?? ''

  const [step, setStep] = useState(0)
  const [title, setTitle] = useState('')
  const [copy, setCopy] = useState('')
  const [brandName, setBrandName] = useState('')
  const [promoCode, setPromoCode] = useState('')
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
  const [contexts, setContexts] = useState<string[]>(['chatgpt', 'claude', 'cursor', 'copilot'])
  const [broadReach, setBroadReach] = useState(false)
  const [targetSources, setTargetSources] = useState<string[]>([])
  const [targetCountries, setTargetCountries] = useState<string[]>([])
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
      setAdvertiser({ id: data.id, status: data.status, balance_cents: data.balance_cents ?? 0 })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load advertiser'
      setError(message)
      toast.error(message)
    }
  }, [router])

  useEffect(() => {
    if (!authLoading) loadAdvertiser()
  }, [authLoading, loadAdvertiser])

  useEffect(() => {
    const onFocus = () => { if (!authLoading) loadAdvertiser() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [authLoading, loadAdvertiser])

  const bidType = objective === 'awareness' ? 'cpm' : 'cpc'
  const budgetCents = Math.round(parseFloat(budget || '0') * 100)
  const balanceCents = advertiser?.balance_cents ?? 0
  const budgetValid = budgetCents >= 1000
  const fundsOk = advertiser?.status === 'active' && balanceCents >= budgetCents
  const canAfford = budgetValid && fundsOk
  const urlValid = /^https?:\/\/\S+\.\S+/i.test(url.trim())
  const bidValid = bidType === 'cpm' ? parseFloat(maxBidCpm) >= 8 : parseFloat(maxBidCpc) > 0

  const stepValid = [
    true,
    title.trim().length > 0 && copy.trim().length > 0 && urlValid && !iconError,
    broadReach || contexts.length > 0,
    budgetValid && bidValid,
    true,
  ]
  const canNext = stepValid[step]

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      const body: Record<string, unknown> = {
        title,
        copy,
        brandName: brandName.trim() || undefined,
        promoCode: promoCode.trim() || undefined,
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
      if (targetCountries.length > 0) body.targetCountries = targetCountries
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

  const meta = STEPS[step]

  return (
    <DashboardShellV2 view="adv" title="New campaign" subtitle="Launch a new campaign." nav={advertiserNav('campaigns')} userName={userName} userEmail={userEmail}>
      <div className="max-w-3xl mx-auto">
        {success ? (
          <div className="rounded-2xl card p-10 text-center">
            <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-4" />
            <p className="text-xl font-semibold text-foreground">Campaign created</p>
            <p className="text-sm text-muted-foreground mt-1">Redirecting to your dashboard…</p>
          </div>
        ) : (
          <>
            <Stepper step={step} onJump={setStep} />

            <div className="rounded-2xl card p-6 md:p-8">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground">{meta.title}</h2>
              <p className="text-sm text-muted-foreground mt-1 mb-7">{meta.sub}</p>

              {/* STEP 1 - OBJECTIVE */}
              {step === 0 && (
                <div className="grid sm:grid-cols-3 gap-3">
                  {([
                    ['awareness', 'Awareness', 'Pay per 1,000 impressions (CPM). Best for reach.'],
                    ['traffic', 'Traffic', 'Pay per click (CPC). Only pay when someone clicks.'],
                    ['performance', 'Performance', 'Pay per click (CPC). Optimized for conversions; requires review.'],
                  ] as const).map(([val, name, desc]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setObjective(val)}
                      className={`rounded-xl border px-4 py-4 text-left transition ${
                        objective === val ? 'bg-violet-50 border-violet-200 ring-1 ring-violet-200' : 'bg-muted border-border hover:border-violet-200'
                      }`}
                    >
                      <span className="block text-sm font-semibold text-foreground">{name}</span>
                      <span className="block text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* STEP 2 - CREATIVE */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1.5">Campaign name</label>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Railway Launch Week" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1.5">Ad copy</label>
                    <input type="text" maxLength={40} value={copy} onChange={(e) => setCopy(e.target.value)} placeholder="Ship faster →" className={inputCls} />
                    <p className="text-xs text-muted-foreground mt-1.5">One short action + optional arrow, up to 40 characters ({copy.length}/40).</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1.5">Brand name <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <input type="text" maxLength={14} value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Brand name (leave blank to show none)" className={inputCls} />
                    <p className="text-xs text-muted-foreground mt-1.5">Brand name only, up to 14 characters.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1.5">Promo code <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <input type="text" maxLength={64} value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder="e.g. PRISM20 (shown in the expanded ad panel)" className={inputCls} />
                    <p className="text-xs text-muted-foreground mt-1.5">Shown as a Copy code button in the expanded ad panel. Leave blank for none.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1.5">Destination URL</label>
                    <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://railway.app" className={inputCls} />
                    {url.trim() && !urlValid && <p className="text-xs text-red-500 mt-1.5">Enter a full URL (https://…).</p>}
                  </div>
                  <div className="grid lg:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground/80 mb-1.5">Icon</label>
                      <IconUpload value={iconUrl || null} onChange={(v) => setIconUrl(v ?? '')} onError={setIconError} error={iconError} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground/80 mb-1.5">Live preview</label>
                      <AdPreview copy={copy} url={url} iconUrl={iconUrl || null} brandName={brandName} variant="expanded" promoCode={promoCode || null} />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3 - TARGETING */}
              {step === 2 && (
                <div className="space-y-6">
                  <ContextTargeting
                    value={contexts}
                    onChange={setContexts}
                    broadReach={broadReach}
                    onBroadReachChange={setBroadReach}
                  />

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Surfaces</label>
                    <div className="flex flex-wrap gap-2">
                      {(['claude', 'cursor', 'codex', 'terminal'] as const).map((s) => (
                        <button key={s} type="button" onClick={() => setTargetSources((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))}
                          className={`text-xs px-3 py-1.5 rounded-full border capitalize transition ${targetSources.includes(s) ? 'bg-violet-50 border-violet-200 text-primary' : 'bg-muted border-border text-muted-foreground hover:text-foreground'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Restrict to specific AI tools. Leave empty for all surfaces.</p>
                  </div>

                  <CountryTargeting value={targetCountries} onChange={setTargetCountries} />

                  <MarketContextPanel contexts={contexts} bidCpm={objective === 'awareness' ? parseFloat(maxBidCpm) || 0 : 0} />
                </div>
              )}

              {/* STEP 4 - BUDGET & SCHEDULE */}
              {step === 3 && (
                <div className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-sm font-medium text-foreground/80">Total budget (USD)</label>
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Wallet size={12} /> Available: ${(balanceCents / 100).toFixed(2)}</span>
                      </div>
                      <input type="number" min="10" step="1" value={budget} onChange={(e) => setBudget(e.target.value)}
                        className={`${inputCls} ${budgetCents > balanceCents ? '!border-red-300' : ''}`} />
                      <p className="text-xs text-muted-foreground mt-1.5">Minimum $10. Reserved from your wallet on creation.</p>
                      {budgetCents > balanceCents && (
                        <p className="text-xs text-red-500 mt-1.5">
                          Exceeds your balance.{' '}
                          <button type="button" onClick={() => setShowAddFunds(true)} className="underline">Top up</button> to continue.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground/80 mb-1.5">Daily budget (USD) <span className="text-muted-foreground font-normal">(optional)</span></label>
                      <input type="number" min="0" step="1" value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} placeholder="No daily cap" className={inputCls} />
                      <p className="text-xs text-muted-foreground mt-1.5">Caps how fast the budget is spent per day.</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    {bidType === 'cpm' ? (
                      <div>
                        <label className="block text-sm font-medium text-foreground/80 mb-1.5">Max CPM bid (USD / 1,000)</label>
                        <input type="number" min="8" step="0.5" value={maxBidCpm} onChange={(e) => setMaxBidCpm(e.target.value)} className={inputCls} />
                        <p className="text-xs text-muted-foreground mt-1.5">Floor $8, typical $8 to $25.</p>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-foreground/80 mb-1.5">Max CPC bid (USD / click)</label>
                        <input type="number" min="0.01" step="0.05" value={maxBidCpc} onChange={(e) => setMaxBidCpc(e.target.value)} className={inputCls} />
                        <p className="text-xs text-muted-foreground mt-1.5">You only pay on clicks. Ranked by bid x predicted CTR.</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-foreground/80 mb-1.5">Frequency cap <span className="text-muted-foreground font-normal">(optional)</span></label>
                      <div className="flex gap-3">
                        <input type="number" min="1" max="100" value={frequencyCap} onChange={(e) => setFrequencyCap(e.target.value)} placeholder="Impressions" className={inputCls} />
                        <select value={frequencyWindow} onChange={(e) => setFrequencyWindow(e.target.value)} className="rounded-lg border border-border bg-input px-3 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40">
                          <option value="1">per hour</option>
                          <option value="24">per day</option>
                          <option value="168">per week</option>
                        </select>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">Limit how often one person sees the ad.</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-foreground/80 mb-1.5">Start date <span className="text-muted-foreground font-normal">(optional)</span></label>
                      <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground/80 mb-1.5">End date <span className="text-muted-foreground font-normal">(optional)</span></label>
                      <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5 - REVIEW */}
              {step === 4 && (
                <div className="space-y-6">
                  <div className="grid lg:grid-cols-2 gap-6">
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Ad preview</p>
                      <AdPreview copy={copy} url={url} iconUrl={iconUrl || null} brandName={brandName} />
                    </div>
                    <div className="rounded-xl border border-border p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Creative</p>
                      <SummaryRow label="Name">{title || '-'}</SummaryRow>
                      <SummaryRow label="Copy">{copy || '-'}</SummaryRow>
                      <SummaryRow label="Brand">{brandName.trim() || 'None'}</SummaryRow>
                      <SummaryRow label="URL"><span className="break-all">{url || '-'}</span></SummaryRow>
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-6">
                    <div className="rounded-xl border border-border p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Targeting</p>
                      <SummaryRow label="Objective"><span className="capitalize">{objective}</span> · {bidType.toUpperCase()}</SummaryRow>
                      <SummaryRow label="Placements">{broadReach || contexts.length === 0 ? 'Broad reach (everywhere)' : `${contexts.slice(0, 4).join(', ')}${contexts.length > 4 ? ` +${contexts.length - 4}` : ''}`}</SummaryRow>
                      <SummaryRow label="Surfaces">{targetSources.length ? targetSources.join(', ') : 'All'}</SummaryRow>
                      <SummaryRow label="Countries">{targetingSummary(targetCountries)}</SummaryRow>
                    </div>
                    <div className="rounded-xl border border-border p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Budget & schedule</p>
                      <SummaryRow label="Total budget">${(budgetCents / 100).toFixed(2)}</SummaryRow>
                      <SummaryRow label="Daily cap">{dailyBudget ? `$${parseFloat(dailyBudget).toFixed(2)}` : 'None'}</SummaryRow>
                      <SummaryRow label={bidType === 'cpm' ? 'Max CPM' : 'Max CPC'}>${(bidType === 'cpm' ? parseFloat(maxBidCpm || '0') : parseFloat(maxBidCpc || '0')).toFixed(2)}</SummaryRow>
                      <SummaryRow label="Frequency">{frequencyCap ? `${frequencyCap} / ${frequencyWindow === '1' ? 'hour' : frequencyWindow === '168' ? 'week' : 'day'}` : 'No cap'}</SummaryRow>
                      <SummaryRow label="Schedule">{startDate ? new Date(startDate).toLocaleDateString() : 'Starts now'}{endDate ? ` → ${new Date(endDate).toLocaleDateString()}` : ''}</SummaryRow>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {objective === 'performance'
                      ? 'Performance campaigns are reviewed before going live.'
                      : 'This campaign goes live immediately. The full budget is reserved from your wallet.'}
                  </p>
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3 text-red-600 mt-6">
                  <AlertCircle size={18} />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* NAV */}
              <div className="flex items-center justify-between gap-3 pt-6 mt-6 border-t border-border">
                {step === 0 ? (
                  <Button type="button" variant="outline" size="lg" href="/advertiser/dashboard">Cancel</Button>
                ) : (
                  <Button type="button" variant="outline" size="lg" onClick={() => setStep((s) => s - 1)}>
                    <ArrowLeft size={16} className="mr-1.5" /> Back
                  </Button>
                )}

                {step < STEPS.length - 1 ? (
                  <Button type="button" size="lg" disabled={!canNext} onClick={() => canNext && setStep((s) => s + 1)}>
                    Next <ArrowRight size={16} className="ml-1.5" />
                  </Button>
                ) : advertiser && budgetValid && !fundsOk ? (
                  <Button type="button" size="lg" onClick={() => setShowAddFunds(true)}>
                    <Wallet size={16} className="mr-1.5" /> Add funds to continue
                  </Button>
                ) : (
                  <Button type="button" size="lg" disabled={loading || !canAfford || (!broadReach && contexts.length === 0)} onClick={handleSubmit}>
                    {loading ? 'Creating…' : !advertiser ? 'Loading…' : objective === 'performance' ? 'Submit for review' : 'Launch campaign'}
                  </Button>
                )}
              </div>
            </div>

            <div className="text-center mt-4">
              <span className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length} · {meta.label}</span>
            </div>
          </>
        )}
      </div>

      {showAddFunds && <AddFundsModal onClose={() => setShowAddFunds(false)} onFunded={loadAdvertiser} />}
    </DashboardShellV2>
  )
}

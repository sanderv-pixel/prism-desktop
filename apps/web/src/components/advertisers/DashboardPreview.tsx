'use client'

import { useEffect, useState } from 'react'
import { StatCard } from '@/components/dashboard/StatCard'
import { AreaChart } from '@/components/dashboard/AreaChart'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { MarketContextPanel } from '@/components/MarketContextPanel'
import { Button } from '@/components/Button'
import {
  Wallet,
  Eye,
  MousePointerClick,
  Target,
  TrendingUp,
  Zap,
  AlertCircle,
  Plus,
} from 'lucide-react'

interface Campaign {
  id: string
  title: string
  status: string
  objective: string
  bidType: string
  budgetCents: number
  spentCents: number
  maxBidCpm: number
  contexts: string[]
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cpm: number
  cpc: number
  createdAt: string
  updatedAt: string
}

interface PublicStats {
  advertiser: {
    id: string
    name: string
    status: string
    subscriptionStatus: string
  }
  stats: {
    totalSpendCents: number
    totalBudgetCents: number
    remainingBudgetCents: number
    totalImpressions: number
    totalClicks: number
    totalConversions: number
    ctr: number
    cpm: number
    cpc: number
    cpa: number
    cvr: number
    reach: number
    frequency: number
    activeCampaigns: number
    totalCampaigns: number
    spendChange: number
  }
  chartData: { date: string; spend: number; impressions: number; clicks: number }[]
  campaigns: Campaign[]
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US').format(n)
}

function Skeleton() {
  return (
    <div className="rounded-2xl card p-6 animate-pulse space-y-6">
      <div className="h-6 bg-muted rounded w-1/3" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 bg-muted rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-muted rounded-xl" />
    </div>
  )
}

export function DashboardPreview() {
  const [data, setData] = useState<PublicStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/public-advertiser-stats')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load preview data')
        return res.json()
      })
      .then((json) => {
        if (!cancelled) setData(json)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <Skeleton />

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-600 flex items-start gap-3">
        <AlertCircle size={20} />
        <div>
          <p className="font-medium">Preview unavailable</p>
          <p className="text-sm opacity-80">{error}</p>
        </div>
      </div>
    )
  }

  const { advertiser, stats, chartData, campaigns } = data
  const isActive = advertiser.status === 'active'
  const allContexts = Array.from(new Set(campaigns.flatMap((c) => c.contexts)))
  const avgBidCpm =
    campaigns.length > 0
      ? campaigns.reduce((sum, c) => sum + c.maxBidCpm, 0) / campaigns.length / 100
      : 0

  return (
    <div className="rounded-2xl card p-5 md:p-8 relative overflow-hidden hover:shadow-md transition">
      <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-100 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />

      <div className="relative">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <p className="eyebrow">Live preview</p>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                Seeded data
              </span>
            </div>
            <h3 className="text-2xl md:text-3xl font-semibold text-foreground mb-2">
              {advertiser.name}
            </h3>
            <div className="flex items-center gap-3">
              <StatusBadge status={advertiser.status} />
              <span className="text-sm text-muted-foreground">
                {advertiser.subscriptionStatus === 'active'
                  ? 'Subscription active'
                  : 'Subscription inactive'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="md" href="/advertiser/campaigns">
              All campaigns
            </Button>
            <Button size="md" href="/advertiser/campaigns/new" disabled={!isActive}>
              <Plus size={16} className="mr-2" />
              New campaign
            </Button>
          </div>
        </div>

        {/* Spend overview */}
        <div className="rounded-2xl card p-6 md:p-8 mb-8 relative overflow-hidden hover:shadow-md transition">
          <div className="relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total spend</p>
                <p className="text-4xl md:text-5xl font-semibold text-foreground">
                  {formatCents(stats.totalSpendCents)}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <TrendingUp size={14} className="text-emerald-600" />
                  <span className="text-sm text-emerald-600">
                    +{stats.spendChange}% vs last 30 days
                  </span>
                </div>
              </div>
              <div className="flex gap-6 md:gap-10">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Budget</p>
                  <p className="text-xl font-medium text-foreground">{formatCents(stats.totalBudgetCents)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Remaining</p>
                  <p className="text-xl font-medium text-foreground">
                    {formatCents(stats.remainingBudgetCents)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Active</p>
                  <p className="text-xl font-medium text-foreground">
                    {stats.activeCampaigns}/{stats.totalCampaigns}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Wallet}
            label="30-day spend"
            value={formatCents(
              chartData.reduce((sum, d) => sum + Math.round(d.spend * 100), 0)
            )}
            change={stats.spendChange}
          />
          <StatCard icon={Eye} label="Impressions" value={formatNumber(stats.totalImpressions)} />
          <StatCard icon={MousePointerClick} label="Clicks" value={formatNumber(stats.totalClicks)} />
          <StatCard icon={Target} label="CTR" value={`${stats.ctr}%`} />
          <StatCard icon={TrendingUp} label="CPM" value={formatCents(stats.cpm)} />
          <StatCard icon={Wallet} label="CPC" value={formatCents(stats.cpc)} />
          <StatCard icon={Target} label="CPA" value={formatCents(stats.cpa)} />
          <StatCard
            icon={Eye}
            label="Reach / Freq"
            value={`${formatNumber(stats.reach)} / ${stats.frequency.toFixed(1)}`}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <div className="rounded-2xl card p-6 hover:shadow-md transition">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-lg font-medium text-foreground">Spend over time</h4>
                  <p className="text-sm text-muted-foreground">Last 30 days</p>
                </div>
                <div className="flex gap-1">
                  {['7d', '30d', '90d'].map((p) => (
                    <span
                      key={p}
                      className={`text-xs px-2.5 py-1 rounded-md cursor-pointer ${
                        p === '30d'
                          ? 'bg-violet-50 text-primary border border-violet-200'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
              <div className="h-64">
                {stats.totalImpressions > 0 ? (
                  <AreaChart
                    data={chartData.map((d) => ({
                      label: d.date.slice(5),
                      value: d.spend,
                    }))}
                    color="#22d3ee"
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                    <TrendingUp size={32} className="opacity-30" />
                    <p>No campaign activity yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <MarketContextPanel contexts={allContexts} bidCpm={avgBidCpm} />
          </div>
        </div>

        {/* Campaigns table */}
        <div className="rounded-2xl card overflow-hidden hover:shadow-md transition">
          <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-lg font-medium text-foreground">Campaigns</h4>
              <p className="text-sm text-muted-foreground">Active and draft campaigns</p>
            </div>
            <Button size="sm" href="/advertiser/campaigns/new" disabled={!isActive}>
              <Plus size={14} className="mr-2" />
              Create campaign
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-medium">Campaign</th>
                  <th className="px-6 py-3 font-medium">Objective</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Budget</th>
                  <th className="px-6 py-3 font-medium">Spent</th>
                  <th className="px-6 py-3 font-medium">Bid</th>
                  <th className="px-6 py-3 font-medium">Imp.</th>
                  <th className="px-6 py-3 font-medium">Clicks</th>
                  <th className="px-6 py-3 font-medium">CTR</th>
                  <th className="px-6 py-3 font-medium">CPM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {campaigns.map((campaign) => {
                  const progress =
                    campaign.budgetCents > 0
                      ? (campaign.spentCents / campaign.budgetCents) * 100
                      : 0
                  return (
                    <tr key={campaign.id} className="hover:bg-muted/30">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-foreground">{campaign.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {campaign.contexts.slice(0, 3).join(', ')}
                            {campaign.contexts.length > 3 && '…'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-foreground/80 capitalize">{campaign.objective}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={campaign.status} />
                      </td>
                      <td className="px-6 py-4 text-foreground/80">{formatCents(campaign.budgetCents)}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-foreground/80">{formatCents(campaign.spentCents)}</p>
                          <div className="w-24 h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-foreground/80">{formatCents(campaign.maxBidCpm)} CPM</td>
                      <td className="px-6 py-4 text-foreground/80">{formatNumber(campaign.impressions)}</td>
                      <td className="px-6 py-4 text-foreground/80">{formatNumber(campaign.clicks)}</td>
                      <td className="px-6 py-4 text-foreground/80">{campaign.ctr}%</td>
                      <td className="px-6 py-4 text-foreground/80">{formatCents(campaign.cpm)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

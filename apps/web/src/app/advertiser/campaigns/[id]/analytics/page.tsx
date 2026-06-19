'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { StatCard } from '@/components/dashboard/StatCard'
import { LineChart } from '@/components/dashboard/LineChart'
import { BarChart } from '@/components/dashboard/BarChart'
import { DateRangePicker } from '@/components/dashboard/DateRangePicker'
import { Button } from '@/components/Button'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import {
  ArrowLeft,
  Wallet,
  Eye,
  MousePointerClick,
  Target,
  TrendingUp,
  Zap,
  AlertCircle,
  Pencil,
} from 'lucide-react'

type RangeValue = 7 | 30 | 90 | 'all'

interface AnalyticsData {
  campaign: {
    id: string
    title: string
    status: string
    objective: string
    bidType: string
    budgetCents: number
    spentCents: number
    maxBidCpm: number
    contexts: string[]
    createdAt: string
  }
  totals: {
    spendCents: number
    impressions: number
    clicks: number
    conversions: number
    ctr: number
    cpc: number
    cpm: number
    cpa: number
    cvr: number
    reach: number
    frequency: number
    percentUsed: number
    daysRemaining: number | null
  }
  chartData: { date: string; spend: number; impressions: number; clicks: number }[]
  contextBreakdown: { name: string; impressions: number; spend: number }[]
  recentActivity: { type: 'impression' | 'click' | 'conversion'; date: string; detail: string }[]
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US').format(n)
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function CampaignAnalyticsPage() {
  const router = useRouter()
  const params = useParams()
  const { user, loading: authLoading } = useAuth()
  const id = params.id as string

  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [range, setRange] = useState<RangeValue>(30)

  async function fetchAnalytics() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/campaigns/${id}/analytics?range=${range}`)
      if (!res.ok) throw new Error('Failed to load analytics')
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [id, range])

  if (authLoading || loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-96 text-muted-foreground">
          <Zap size={18} className="animate-pulse text-primary mr-2" />
          Loading analytics…
        </div>
      </DashboardShell>
    )
  }

  if (error || !data) {
    return (
      <DashboardShell>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-600 flex items-start gap-3">
          <AlertCircle size={20} />
          <div>
            <p className="font-medium">Failed to load analytics</p>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        </div>
      </DashboardShell>
    )
  }

  const { campaign, totals, chartData, contextBreakdown, recentActivity } = data
  const progress = campaign.budgetCents > 0 ? (campaign.spentCents / campaign.budgetCents) * 100 : 0

  return (
    <DashboardShell>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="sm" href="/advertiser/dashboard">
              <ArrowLeft size={16} className="mr-1" />
              Dashboard
            </Button>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">Analytics</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground">{campaign.title}</h1>
            <StatusBadge status={campaign.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1 capitalize">
            {campaign.objective} · {campaign.bidType} · Max bid {formatCents(campaign.maxBidCpm)} CPM
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker value={range} onChange={setRange} />
          <Button size="md" variant="outline" href={`/advertiser/campaigns/${id}`}>
            <Pencil size={16} className="mr-2" />
            Edit
          </Button>
        </div>
      </div>

      {/* Budget pacing */}
      <div className="rounded-xl border border-border bg-white p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Budget pacing</p>
            <p className="text-2xl font-semibold text-foreground">
              {formatCents(campaign.spentCents)}{' '}
              <span className="text-base font-normal text-muted-foreground">
                of {formatCents(campaign.budgetCents)}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{totals.percentUsed}% used</p>
            {totals.daysRemaining !== null && (
              <p className="text-sm text-muted-foreground">
                {totals.daysRemaining > 0
                  ? `~${totals.daysRemaining} days of budget left`
                  : 'Budget exhausted'}
              </p>
            )}
          </div>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Wallet} label="Spend" value={formatCents(totals.spendCents)} />
        <StatCard icon={Eye} label="Impressions" value={formatNumber(totals.impressions)} />
        <StatCard icon={MousePointerClick} label="Clicks" value={formatNumber(totals.clicks)} />
        <StatCard icon={Target} label="CTR" value={`${totals.ctr}%`} />
        <StatCard icon={TrendingUp} label="CPM" value={formatCents(totals.cpm)} />
        <StatCard icon={Wallet} label="CPC" value={formatCents(totals.cpc)} />
        <StatCard
          icon={Target}
          label="CPA"
          value={totals.conversions > 0 ? formatCents(totals.cpa) : '—'}
        />
        <StatCard
          icon={Eye}
          label="Reach / Freq"
          value={`${formatNumber(totals.reach)} / ${totals.frequency.toFixed(1)}`}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Time-series chart */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-white p-6">
          <h3 className="text-base font-semibold text-foreground mb-1">Performance over time</h3>
          <p className="text-sm text-muted-foreground mb-6">Spend and impressions</p>
          <div className="h-72">
            {chartData.some((d) => d.impressions > 0 || d.spend > 0) ? (
              <LineChart
                data={chartData.map((d) => ({
                  date: d.date.slice(5),
                  spend: d.spend,
                  impressions: d.impressions,
                }))}
                xAxisKey="date"
                lines={[
                  {
                    key: 'spend',
                    label: 'Spend',
                    color: '#8b5cf6',
                    yAxisId: 'left',
                  },
                  {
                    key: 'impressions',
                    label: 'Impressions',
                    color: '#06b6d4',
                    yAxisId: 'right',
                  },
                ]}
                valueFormatter={(v) => `$${Number(v).toFixed(2)}`}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No activity in this period.
              </div>
            )}
          </div>
        </div>

        {/* Context breakdown */}
        <div className="rounded-xl border border-border bg-white p-6">
          <h3 className="text-base font-semibold text-foreground mb-1">Top contexts</h3>
          <p className="text-sm text-muted-foreground mb-6">Impressions by tool/context</p>
          <div className="h-72">
            {contextBreakdown.length > 0 ? (
              <BarChart
                data={contextBreakdown.map((c) => ({
                  label: c.name.slice(0, 12),
                  value: c.impressions,
                }))}
                color="#8b5cf6"
                valueFormatter={(v) => formatNumber(v)}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No context data yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conversion funnel + recent activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-white p-6">
          <h3 className="text-base font-semibold text-foreground mb-1">Conversion funnel</h3>
          <p className="text-sm text-muted-foreground mb-6">Impressions → Clicks → Conversions</p>
          <div className="space-y-5">
            {[
              { label: 'Impressions', value: totals.impressions, color: 'bg-violet-500' },
              { label: 'Clicks', value: totals.clicks, color: 'bg-cyan-500' },
              { label: 'Conversions', value: totals.conversions, color: 'bg-emerald-500' },
            ].map((step) => {
              const max = Math.max(totals.impressions, 1)
              return (
                <div key={step.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-foreground">{step.label}</span>
                    <span className="text-muted-foreground">{formatNumber(step.value)}</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${step.color} rounded-full`}
                      style={{ width: `${Math.min((step.value / max) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">Recent activity</h3>
          {recentActivity.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {recentActivity.map((event, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        event.type === 'impression'
                          ? 'bg-violet-500'
                          : event.type === 'click'
                          ? 'bg-cyan-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                    <span className="text-sm text-foreground capitalize">{event.type}</span>
                    <span className="text-sm text-muted-foreground hidden sm:inline">
                      {event.detail}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{timeAgo(event.date)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}

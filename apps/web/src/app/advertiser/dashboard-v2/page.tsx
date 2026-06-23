'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Megaphone,
  Target,
  Wallet,
  Settings,
  Zap,
  AlertCircle,
} from 'lucide-react'
import '../../dashboard-v2/dashboard-v2.css'
import { useAuth } from '@/hooks/useAuth'
import { DashboardShellV2 } from '@/components/dashboard-v2/DashboardShellV2'
import { KpiCard } from '@/components/dashboard-v2/KpiCard'
import { AreaChartV2 } from '@/components/dashboard-v2/AreaChartV2'
import { BarBreakdown } from '@/components/dashboard-v2/BarBreakdown'
import { CampaignsTable, type CampaignRow } from '@/components/dashboard-v2/CampaignsTable'
import { formatCents, formatNumber, compact } from '@/components/dashboard-v2/format'

type RangeValue = 7 | 30 | 90 | 'all'

interface AdvertiserStats {
  advertiser: { id: string; name: string; status: string; subscriptionStatus: string; balanceCents: number; lifetimeDepositsCents: number }
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
    roas: number
    reach: number
    frequency: number
    activeCampaigns: number
    totalCampaigns: number
    spendChange: number
  }
  chartData: { date: string; spend: number; impressions: number; clicks: number }[]
  contextBreakdown: { name: string; impressions: number; spend: number; clicks: number }[]
  sourceBreakdown: { name: string; impressions: number; spend: number }[]
  campaigns: CampaignRow[]
}

const NAV = [
  {
    title: 'Advertiser',
    items: [
      { label: 'Overview', href: '/advertiser/dashboard', icon: <LayoutDashboard size={16} />, active: true },
      { label: 'Campaigns', href: '/advertiser/campaigns', icon: <Megaphone size={16} /> },
      { label: 'Conversions', href: '/advertiser/conversions', icon: <Target size={16} /> },
      { label: 'Billing', href: '/advertiser/billing', icon: <Wallet size={16} /> },
    ],
  },
  { title: 'Account', items: [{ label: 'Settings', href: '/advertiser/settings', icon: <Settings size={16} /> }] },
]

export default function AdvertiserDashboardV2() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<AdvertiserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [range, setRange] = useState<RangeValue>(30)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/advertiser-stats?range=${range}`)
      if (res.status === 404) {
        router.push('/advertiser/onboarding')
        return
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to load advertiser dashboard')
      }
      setData(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [range, router])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  async function updateCampaign(id: string, status: string) {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update campaign')
      await fetchStats()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setActionLoading(null)
    }
  }

  const userName = data?.advertiser.name || (user?.email ? user.email.split('@')[0] : 'advertiser')
  const userEmail = user?.email ?? ''

  const rangeSelect = (
    <select className="dv-select" value={String(range)} onChange={(e) => setRange((e.target.value === 'all' ? 'all' : Number(e.target.value)) as RangeValue)}>
      <option value="7">7 days</option>
      <option value="30">30 days</option>
      <option value="90">90 days</option>
      <option value="all">All time</option>
    </select>
  )

  if (authLoading || loading) {
    return (
      <DashboardShellV2 view="adv" title="Loading…" subtitle="" nav={NAV} userName={userName} userEmail={userEmail}>
        <div className="dv-loadwrap"><Zap size={18} className="animate-pulse" /> Loading advertiser dashboard…</div>
      </DashboardShellV2>
    )
  }

  if (error || !data) {
    return (
      <DashboardShellV2 view="adv" title="Campaigns overview" subtitle="" nav={NAV} userName={userName} userEmail={userEmail}>
        <div className="dv-alert">
          <AlertCircle size={20} />
          <div><p style={{ fontWeight: 600 }}>Failed to load dashboard</p><p style={{ fontSize: 13, opacity: 0.85 }}>{error}</p></div>
        </div>
      </DashboardShellV2>
    )
  }

  const { stats, chartData, contextBreakdown, campaigns } = data

  const imprSeries = chartData.map((d) => d.impressions)
  const clkSeries = chartData.map((d) => d.clicks)
  const maxImpr = Math.max(...imprSeries, 1)
  const maxClk = Math.max(...clkSeries, 1)
  const clicksScaled = clkSeries.map((c) => c * (maxImpr / maxClk) * 0.85)
  const imprSpark = imprSeries.slice(-8)

  const reachRows = contextBreakdown.slice(0, 5).map((c) => ({ name: c.name, value: c.impressions, display: compact(c.impressions) }))

  const spendDelta = (
    <><b className={stats.spendChange < 0 ? 'down' : ''}>{stats.spendChange < 0 ? '▼' : '▲'} {Math.abs(stats.spendChange)}%</b> · {formatCents(stats.remainingBudgetCents)} left</>
  )

  const primary = (
    <>
      {rangeSelect}
      <a className="dv-btn dv-btn-g" href="/advertiser/billing">Add funds</a>
      <a className="dv-btn dv-btn-p" href="/advertiser/campaigns">+ New campaign</a>
    </>
  )

  return (
    <DashboardShellV2
      view="adv"
      title="Campaigns overview"
      subtitle="Reach developers in-flow. Live performance below."
      primary={primary}
      nav={NAV}
      userName={userName}
      userEmail={userEmail}
    >
      <div className="dv-grid dv-kpis">
        <KpiCard label="Spend" dotColor="var(--v400)" value={stats.totalSpendCents} format={(n) => formatCents(n)} delta={spendDelta} />
        <KpiCard label="Validated impressions" dotColor="var(--cyan)" value={stats.totalImpressions} format={(n) => formatNumber(n)} spark={imprSpark} sparkColor="#22d3ee" delta={`${formatNumber(stats.totalClicks)} clicks`} />
        <KpiCard label="CTR" dotColor="var(--emerald)" value={stats.ctr} format={(n) => `${n.toFixed(2)}%`} emphasis delta="click-through rate" />
        <KpiCard label="Conversions" dotColor="var(--amber)" value={stats.totalConversions} format={(n) => formatNumber(n)} delta={stats.totalConversions > 0 ? `CPA ${formatCents(stats.cpa)}` : 'no conversions yet'} />
      </div>

      <div className="dv-row2">
        <div className="dv-card">
          <h3>Delivery <span className="meta">impressions · last {chartData.length} days</span></h3>
          <div className="dv-chartwrap">
            <AreaChartV2 data={imprSeries} avg={clicksScaled} labels={chartData.map((d) => d.date)} tooltipRows={(i) => [{ label: 'Impressions', value: formatNumber(chartData[i].impressions), color: '#22d3ee' }, { label: 'Clicks', value: formatNumber(chartData[i].clicks), color: '#ec4899' }]} color1="#22d3ee" color2="#ec4899" emptyLabel="No delivery yet" />
          </div>
          <div className="dv-legend">
            <span><i style={{ background: '#22d3ee' }} /> impressions</span>
            <span><i style={{ background: '#ec4899' }} /> clicks</span>
          </div>
        </div>
        <div className="dv-card">
          <h3>Audience reach <span className="meta">by tool</span></h3>
          <BarBreakdown rows={reachRows} variant="cyan" emptyLabel="No reach data yet" />
        </div>
      </div>

      <div className="dv-card" style={{ marginTop: 16 }}>
        <h3>Campaigns <span className="meta">{stats.activeCampaigns} active · {stats.totalCampaigns} total</span></h3>
        <CampaignsTable campaigns={campaigns} onUpdate={updateCampaign} actionLoading={actionLoading} />
      </div>

      <div className="dv-ftnote">Real campaign data · {range === 'all' ? 'all time' : `last ${range} days`}</div>
    </DashboardShellV2>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  Users,
  Monitor,
  Settings,
  Zap,
  AlertCircle,
  X,
} from 'lucide-react'
import './dashboard-v2.css'
import { useAuth } from '@/hooks/useAuth'
import { DashboardShellV2 } from '@/components/dashboard-v2/DashboardShellV2'
import { KpiCard } from '@/components/dashboard-v2/KpiCard'
import { AreaChartV2 } from '@/components/dashboard-v2/AreaChartV2'
import { BarBreakdown } from '@/components/dashboard-v2/BarBreakdown'
import { ActivityFeed } from '@/components/dashboard-v2/ActivityFeed'
import { PayoutProgress } from '@/components/dashboard-v2/PayoutProgress'
import { ReferralCard } from '@/components/dashboard-v2/ReferralCard'
import { DevicesCard, type DeviceInfo } from '@/components/dashboard-v2/DevicesCard'
import { PayoutMethodForm } from '@/components/dashboard/PayoutMethodForm'
import { formatCents, formatNumber } from '@/components/dashboard-v2/format'

interface ConnectStatus {
  onboardingComplete: boolean
  payoutsEnabled: boolean
  chargesEnabled: boolean
  kycStatus: string
  provider: string | null
  configured: boolean
}

interface DashboardData {
  user: { id: string; email: string; payoutEnabled: boolean; payoutHold: boolean; connectStatus: ConnectStatus }
  stats: {
    totalEarningsCents: number
    ownEarningsCents: number
    referralEarningsCents: number
    balanceCents: number
    totalImpressions: number
    validatedImpressions: number
    clicks: number
    ctr: number
    avgDurationMs: number
    earningsChange: number
    impressionsChange: number
    pendingPayoutCents: number
    last30EarningsCents: number
  }
  referral: { referralCode: string | null; referredCount: number; referralEarningsCents: number }
  chartData: { date: string; earnings: number; impressions: number }[]
  toolBreakdown: { tool: string; count: number; earnings: number }[]
  recentImpressions: {
    id: string
    advertiserName: string
    campaignTitle: string
    context: unknown
    validated: boolean
    paid: boolean
    payoutCents: number
    createdAt: string
  }[]
  payouts: { id: string; amountCents: number; status: string; createdAt: string; paidAt: string | null }[]
}

const NAV = (active: string) => [
  {
    title: 'Earner',
    items: [
      { label: 'Overview', href: '/dashboard', icon: <LayoutDashboard size={16} />, active: active === 'overview' },
      { label: 'Earnings', href: '/dashboard#earnings', icon: <TrendingUp size={16} /> },
      { label: 'Payouts', href: '/dashboard#payouts', icon: <Wallet size={16} /> },
      { label: 'Referrals', href: '/dashboard#referrals', icon: <Users size={16} /> },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Devices', href: '/dashboard#devices', icon: <Monitor size={16} /> },
      { label: 'Settings', href: '/dashboard/settings', icon: <Settings size={16} /> },
    ],
  },
]

export default function EarnerDashboardV2() {
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [showPayoutSetup, setShowPayoutSetup] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)
  const [copied, setCopied] = useState(false)

  async function fetchDashboard() {
    try {
      const res = await fetch('/api/dashboard')
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to load dashboard')
      }
      setData(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function fetchDevices() {
    try {
      const res = await fetch('/api/dashboard/devices')
      if (res.ok) setDevices((await res.json()).devices ?? [])
    } catch {
      // non-critical
    }
  }

  async function revokeDevice(id: string) {
    if (!confirm('Disconnect this device? Its key stops working and the overlay must re-pair to earn again.')) return
    const res = await fetch('/api/dashboard/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      toast.success('Device disconnected')
      fetchDevices()
    } else {
      toast.error('Could not disconnect device')
    }
  }

  useEffect(() => {
    fetchDashboard()
    fetchDevices()
  }, [])

  async function handleWithdraw(amountCents?: number) {
    setWithdrawing(true)
    try {
      const res = await fetch('/api/dashboard/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(amountCents ? { amountCents } : {}),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Withdrawal failed')
      setShowWithdraw(false)
      await fetchDashboard()
      toast.success('Withdrawal request submitted.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Withdrawal failed')
    } finally {
      setWithdrawing(false)
    }
  }

  async function copyReferral() {
    const code = data?.referral.referralCode
    if (!code) return
    const link = `${window.location.origin}/?ref=${code}`
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const userName = user?.email ? user.email.split('@')[0] : 'creator'
  const userEmail = user?.email ?? ''

  if (authLoading || loading) {
    return (
      <DashboardShellV2 view="earn" title="Loading…" subtitle="" nav={NAV('overview')} userName={userName} userEmail={userEmail}>
        <div className="dv-loadwrap">
          <Zap size={18} className="animate-pulse" /> Loading dashboard…
        </div>
      </DashboardShellV2>
    )
  }

  if (error || !data) {
    return (
      <DashboardShellV2 view="earn" title="Dashboard" subtitle="" nav={NAV('overview')} userName={userName} userEmail={userEmail}>
        <div className="dv-alert">
          <AlertCircle size={20} />
          <div>
            <p style={{ fontWeight: 600 }}>Failed to load dashboard</p>
            <p style={{ fontSize: 13, opacity: 0.85 }}>{error}</p>
          </div>
        </div>
      </DashboardShellV2>
    )
  }

  const { stats, chartData, toolBreakdown, recentImpressions, referral } = data
  const passRate = stats.totalImpressions > 0 ? (stats.validatedImpressions / stats.totalImpressions) * 100 : 0
  const configured = data.user.connectStatus.configured
  const balanceDollars = stats.balanceCents / 100

  const earningsSeries = chartData.map((d) => d.earnings)
  const monthSpark = earningsSeries.slice(-8)

  const toolRows = toolBreakdown.slice(0, 5).map((t) => ({
    name: t.tool,
    value: t.earnings,
    display: `$${t.earnings.toFixed(2)}`,
  }))

  const primary = (
    <>
      <a className="dv-btn dv-btn-g" href="/api/dashboard/export" download>
        Export
      </a>
      {configured ? (
        <button className="dv-btn dv-btn-p" onClick={() => { setWithdrawAmount(balanceDollars.toFixed(2)); setShowWithdraw(true) }} disabled={stats.balanceCents <= 0}>
          Withdraw {formatCents(stats.balanceCents)}
        </button>
      ) : (
        <button className="dv-btn dv-btn-p" onClick={() => setShowPayoutSetup(true)}>Set up payouts</button>
      )}
    </>
  )

  const change = stats.earningsChange
  const monthDelta = (
    <>
      <b className={change < 0 ? 'down' : ''}>{change < 0 ? '▼' : '▲'} {Math.abs(change)}%</b> vs last month
    </>
  )

  return (
    <DashboardShellV2
      view="earn"
      title={`Good to see you, ${userName}`}
      subtitle="Here's what your AI wait time earned."
      primary={primary}
      nav={NAV('overview')}
      userName={userName}
      userEmail={userEmail}
    >
      <div className="dv-grid dv-kpis">
        <KpiCard label="Available balance" dotColor="var(--emerald)" value={stats.balanceCents} format={(n) => formatCents(n)} emphasis delta="ready to withdraw" />
        <KpiCard label="This month" dotColor="var(--v400)" value={stats.last30EarningsCents} format={(n) => formatCents(n)} delta={monthDelta} spark={monthSpark} />
        <KpiCard label="Total earned" dotColor="var(--cyan)" value={stats.totalEarningsCents} format={(n) => formatCents(n)} delta="since you installed" />
        <KpiCard label="Validated views" dotColor="var(--amber)" value={stats.validatedImpressions} format={(n) => formatNumber(n)} delta={`${passRate.toFixed(1)}% pass rate`} />
      </div>

      <div className="dv-row2">
        <div className="dv-card" id="earnings" style={{ scrollMarginTop: 24 }}>
          <h3>Earnings <span className="meta">last {chartData.length || 14} days</span></h3>
          <div className="dv-chartwrap">
            <AreaChartV2 data={earningsSeries} color1="#8b5cf6" color2="#22d3ee" emptyLabel="No earnings yet" />
          </div>
          <div className="dv-legend">
            <span><i style={{ background: '#8b5cf6' }} /> daily earnings</span>
            <span><i style={{ background: '#22d3ee' }} /> 7-day avg</span>
          </div>
        </div>
        <div className="dv-card" id="payouts" style={{ scrollMarginTop: 24 }}>
          <h3>Payout progress</h3>
          <PayoutProgress balanceCents={stats.balanceCents} autoEnabled={configured} payoutsConfigured={configured} />
          <div id="referrals" style={{ scrollMarginTop: 24 }}>
            <ReferralCard earningsCents={referral.referralEarningsCents} referredCount={referral.referredCount} referralCode={referral.referralCode} onCopy={copyReferral} copied={copied} />
          </div>
        </div>
      </div>

      <div className="dv-row2">
        <div className="dv-card">
          <h3>Live activity <span className="meta">recent</span></h3>
          <ActivityFeed items={recentImpressions} />
        </div>
        <div className="dv-card">
          <h3>By tool <span className="meta">this month</span></h3>
          <BarBreakdown rows={toolRows} emptyLabel="No tool activity yet" />
        </div>
      </div>

      <div id="devices" style={{ marginTop: 16, scrollMarginTop: 24 }}>
        <DevicesCard devices={devices} onRevoke={revokeDevice} />
      </div>

      <div className="dv-ftnote">Real data from your account · updates as your agents work</div>

      {showWithdraw && (
        <div className="dv-modalbg" onClick={() => setShowWithdraw(false)}>
          <div className="dv-modal" onClick={(e) => e.stopPropagation()}>
            <button className="dv-modalx" onClick={() => setShowWithdraw(false)} aria-label="Close"><X size={18} /></button>
            <h3>Withdraw earnings</h3>
            <p>Paid to your saved payout method after review. Available: {formatCents(stats.balanceCents)}.</p>
            <input
              className="dv-input"
              type="number"
              step="0.01"
              min="0"
              max={balanceDollars}
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="dv-btn dv-btn-g" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowWithdraw(false)}>Cancel</button>
              <button
                className="dv-btn dv-btn-p"
                style={{ flex: 1, justifyContent: 'center' }}
                disabled={withdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                onClick={() => handleWithdraw(Math.round(parseFloat(withdrawAmount) * 100))}
              >
                {withdrawing ? 'Submitting…' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPayoutSetup && (
        <div className="dv-modalbg" onClick={() => setShowPayoutSetup(false)}>
          <div
            className="dv-modal dash-dark"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 600, maxHeight: '85vh', overflowY: 'auto', background: '#0c0c14', backgroundImage: 'none' }}
          >
            <button className="dv-modalx" onClick={() => setShowPayoutSetup(false)} aria-label="Close"><X size={18} /></button>
            <h3>Set up your payout method</h3>
            <p>Choose how you want to receive your earnings. Minimum payout is $20.</p>
            <PayoutMethodForm onSaved={() => { setShowPayoutSetup(false); fetchDashboard() }} />
          </div>
        </div>
      )}
    </DashboardShellV2>
  )
}

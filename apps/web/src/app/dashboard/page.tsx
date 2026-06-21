'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { StatCard } from '@/components/dashboard/StatCard'
import { AreaChart } from '@/components/dashboard/AreaChart'
import { BarChart } from '@/components/dashboard/BarChart'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { Button } from '@/components/Button'
import {
  Wallet,
  Eye,
  MousePointerClick,
  Clock,
  TrendingUp,
  Zap,
  AlertCircle,
  CheckCircle2,
  Download,
  Bell,
  Target,
  Users,
  Copy,
  Check,
  Info,
  Monitor,
  Plus,
  X,
} from 'lucide-react'

interface ConnectStatus {
  onboardingComplete: boolean
  payoutsEnabled: boolean
  chargesEnabled: boolean
  kycStatus: string
  provider: string | null
  configured: boolean
}

interface DashboardData {
  user: {
    id: string
    email: string
    payoutEnabled: boolean
    payoutHold: boolean
    connectStatus: ConnectStatus
  }
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
  referral: {
    referralCode: string | null
    referredCount: number
    referralEarningsCents: number
  }
  chartData: { date: string; earnings: number; impressions: number }[]
  toolBreakdown: { tool: string; count: number; earnings: number }[]
  recentImpressions: {
    id: string
    advertiserName: string
    campaignTitle: string
    context: unknown
    validated: boolean
    paid: boolean
    notPaidReason: string | null
    payoutCents: number
    durationMs: number | null
    createdAt: string
  }[]
  payouts: {
    id: string
    amountCents: number
    status: string
    createdAt: string
    paidAt: string | null
  }[]
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

// A single impression now earns a fraction of a cent (50% of the bid), so show
// sub-dollar amounts in cents and only switch to dollars at $1+.
function formatEarning(cents: number) {
  if (cents < 100) return `${cents.toFixed(cents < 10 ? 2 : 1)}¢`
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

interface DeviceInfo {
  id: string
  createdAt: string
  lastUsedAt: string | null
  lastSeenIp: string | null
  hasFingerprint: boolean
  revoked: boolean
  active: boolean
}

export default function BuilderDashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [settingUpPayouts, setSettingUpPayouts] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  async function copyToClipboard(value: string, field: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      // ignore
    }
  }

  async function fetchDashboard() {
    try {
      const res = await fetch('/api/dashboard')
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to load dashboard')
      }
      const json = await res.json()
      setData(json)
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
      toast.success('Withdrawal request submitted. It will be reviewed and paid to your saved payout method.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Withdrawal failed'
      setError(message)
      toast.error(message)
    } finally {
      setWithdrawing(false)
    }
  }

  async function handleSetupPayouts() {
    window.location.href = '/dashboard/payout-method'
  }

  useEffect(() => {
    fetchDashboard()
    fetchDevices()
  }, [])

  if (authLoading || loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-96">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Zap size={18} className="animate-pulse text-primary" />
            Loading dashboard…
          </div>
        </div>
      </DashboardShell>
    )
  }

  if (error || !data) {
    return (
      <DashboardShell>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-600 flex items-start gap-3">
          <AlertCircle size={20} />
          <div>
            <p className="font-medium">Failed to load dashboard</p>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        </div>
      </DashboardShell>
    )
  }

  const { stats, chartData, toolBreakdown, recentImpressions, payouts } = data
  const hasData = stats.totalImpressions > 0

  return (
    <DashboardShell>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <p className="eyebrow mb-2">Creator dashboard</p>
          <h1 className="text-3xl md:text-4xl font-semibold text-foreground mb-2">
            Good to see you, {user?.email ? user.email.split('@')[0] : 'creator'}
          </h1>
          <p className="text-muted-foreground">
            Track earnings, impressions, and manage your Prism account.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="md" href="/advertiser/dashboard">
            <Target size={16} className="mr-2" />
            Advertiser dashboard
          </Button>
          <a
            href="/api/dashboard/export"
            download
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted whitespace-nowrap"
          >
            <Download size={15} /> Export
          </a>
          <Button variant="outline" size="md" href="/dashboard/settings">
            Settings
          </Button>
          {!data.user.connectStatus.configured ? (
            <Button size="md" onClick={handleSetupPayouts}>
              <Download size={16} className="mr-2" />
              Set up payouts
            </Button>
          ) : (
            <Button
              size="md"
              onClick={() => {
                setWithdrawAmount((stats.balanceCents / 100).toFixed(2))
                setShowWithdraw(true)
              }}
              disabled={!data.user.payoutEnabled}
            >
              <Download size={16} className="mr-2" />
              Withdraw
            </Button>
          )}
        </div>
      </div>

      {/* Balance card */}
      <div className="rounded-2xl card p-6 md:p-8 mb-8 relative overflow-hidden hover:shadow-md transition">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-100 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Available balance</p>
              <p className="text-4xl md:text-5xl font-semibold text-foreground">
                {formatCents(stats.balanceCents)}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <TrendingUp size={14} className="text-emerald-600" />
                <span className="text-sm text-emerald-600">
                  +{formatCents(stats.totalEarningsCents)} lifetime earnings
                </span>
              </div>
            </div>
            <div className="flex gap-6 md:gap-10">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Pending
                </p>
                <p className="text-xl font-medium text-foreground">
                  {formatCents(stats.pendingPayoutCents)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Validated
                </p>
                <p className="text-xl font-medium text-foreground">
                  {formatNumber(stats.validatedImpressions)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Avg attention
                </p>
                <p className="text-xl font-medium text-foreground">
                  {Math.round(stats.avgDurationMs / 1000)}s
                </p>
              </div>
            </div>
          </div>

          {!data.user.connectStatus.configured && (
            <div className="mt-6 rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
              <Bell size={18} className="text-amber-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Payout method required
                </p>
                <p className="text-sm text-amber-700">
                  Add your Wise or Payoneer details to withdraw earnings. Minimum payout is $20.
                </p>
              </div>
            </div>
          )}
          {data.user.connectStatus.configured && !data.user.payoutEnabled && stats.balanceCents < 2000 && (
            <div className="mt-6 rounded-xl bg-blue-50 border border-blue-200 p-4 flex items-start gap-3">
              <Clock size={18} className="text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Minimum payout: $20
                </p>
                <p className="text-sm text-blue-700">
                  Your payout method is set up. Withdraw unlocks once your balance reaches $20.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {data.user.payoutHold && (
        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Payouts on hold</p>
            <p className="text-sm text-amber-700">
              Your account is under review by our fraud checks, so new earnings are held and withdrawals are
              paused. This usually clears as normal activity accrues. Contact support if it persists.
            </p>
          </div>
        </div>
      )}

      {/* Devices */}
      <div className="rounded-2xl card p-6 hover:shadow-md transition mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-foreground">Your devices</h3>
            <p className="text-sm text-muted-foreground">Where Prism is connected and earning.</p>
          </div>
          <a
            href="/install"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1 whitespace-nowrap"
          >
            <Plus size={15} /> Connect a device
          </a>
        </div>
        {devices.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Monitor size={28} className="mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm font-medium text-foreground">No device connected</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Install Prism on your Mac to start earning while your AI thinks.
            </p>
            <Button size="md" href="/install">
              <Download size={15} className="mr-2" /> Install Prism
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between py-3 px-4 rounded-xl bg-muted/50 border border-border"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      d.revoked ? 'bg-muted-foreground' : d.active ? 'bg-emerald-500' : 'bg-amber-400'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground/90 flex items-center gap-2">
                      <Monitor size={14} /> macOS overlay
                      {d.revoked && <span className="text-xs text-muted-foreground">disconnected</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {d.revoked
                        ? 'Revoked'
                        : d.active
                          ? 'Active now'
                          : d.lastUsedAt
                            ? `Last seen ${timeAgo(d.lastUsedAt)}`
                            : 'Never used'}
                      {d.lastSeenIp ? ` · ${d.lastSeenIp}` : ''}
                    </p>
                  </div>
                </div>
                {!d.revoked && (
                  <button
                    onClick={() => revokeDevice(d.id)}
                    className="text-xs text-red-500 hover:text-red-600 hover:underline whitespace-nowrap"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Wallet}
          label="30-day earnings"
          value={formatCents(stats.last30EarningsCents)}
          change={stats.earningsChange}
        />
        <StatCard
          icon={Eye}
          label="30-day impressions"
          value={formatNumber(
            chartData.reduce((sum, d) => sum + d.impressions, 0)
          )}
          change={stats.impressionsChange}
        />
        <StatCard
          icon={MousePointerClick}
          label="Click-through rate"
          value={`${stats.ctr}%`}
        />
        <StatCard
          icon={Clock}
          label="Avg attention"
          value={`${Math.round(stats.avgDurationMs / 1000)}s`}
        />
      </div>

      {/* Referral + transparency */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 rounded-2xl card p-6 hover:shadow-md transition">
          <div className="flex items-start gap-4 mb-6">
            <div className="h-12 w-12 rounded-xl bg-violet-50 flex items-center justify-center text-primary">
              <Users size={24} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground">Refer creators</h3>
              <p className="text-sm text-muted-foreground">
                Earn 10% of what your referred creators earn, for life.
              </p>
            </div>
          </div>

          {data.referral.referralCode ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  Your referral code
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-lg border border-border bg-muted/50 px-4 py-2.5 font-mono text-foreground">
                    {data.referral.referralCode}
                  </div>
                  <button
                    onClick={() => copyToClipboard(data.referral.referralCode!, 'code')}
                    className="inline-flex items-center justify-center rounded-lg border border-border bg-white px-3 py-2.5 text-muted-foreground hover:text-foreground hover:border-primary/50 transition"
                    aria-label="Copy referral code"
                  >
                    {copiedField === 'code' ? (
                      <Check size={18} className="text-emerald-600" />
                    ) : (
                      <Copy size={18} />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  Share link
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-sm text-foreground truncate">
                    {`https://goprism.dev/auth/sign-up?ref=${data.referral.referralCode}`}
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `https://goprism.dev/auth/sign-up?ref=${data.referral.referralCode}`,
                        'link'
                      )
                    }
                    className="inline-flex items-center justify-center rounded-lg border border-border bg-white px-3 py-2.5 text-muted-foreground hover:text-foreground hover:border-primary/50 transition"
                    aria-label="Copy referral link"
                  >
                    {copiedField === 'link' ? (
                      <Check size={18} className="text-emerald-600" />
                    ) : (
                      <Copy size={18} />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="rounded-xl bg-muted/50 border border-border p-4">
                  <p className="text-xs text-muted-foreground mb-1">Referred creators</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {formatNumber(data.referral.referredCount)}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/50 border border-border p-4">
                  <p className="text-xs text-muted-foreground mb-1">Referral earnings</p>
                  <p className="text-2xl font-semibold text-emerald-600">
                    +{formatCents(data.referral.referralEarningsCents)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-muted/50 border border-border p-4 text-sm text-muted-foreground">
              Your referral code is being generated. Check back in a moment.
            </div>
          )}
        </div>

        <div className="rounded-2xl card p-6 hover:shadow-md transition">
          <div className="flex items-start gap-3 mb-4">
            <Info size={20} className="text-primary mt-0.5" />
            <h3 className="text-lg font-medium text-foreground">How earnings work</h3>
          </div>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              You earn 50% of the advertiser's clearing price per validated impression.
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              Referrers earn an extra 10% of what their referred creators earn.
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              Payouts are sent via Wise or Payoneer once you reach $20.
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              Impressions may be held while our fraud checks run.
            </li>
          </ul>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 rounded-2xl card p-6 hover:shadow-md transition">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-foreground">Earnings over time</h3>
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
            {hasData ? (
              <AreaChart
                data={chartData.map((d) => ({
                  label: d.date.slice(5),
                  value: d.earnings,
                }))}
                color="#a78bfa"
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                <TrendingUp size={32} className="opacity-30" />
                <p>No earnings yet. Install Prism and start creating.</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl card p-6 hover:shadow-md transition">
          <h3 className="text-lg font-medium text-foreground mb-1">By tool</h3>
          <p className="text-sm text-muted-foreground mb-6">Earnings per AI tool</p>
          <div className="h-56">
            {toolBreakdown.length > 0 ? (
              <BarChart
                data={toolBreakdown.slice(0, 6).map((t) => ({
                  label: t.tool.slice(0, 8),
                  value: t.earnings,
                }))}
                valueFormatter={(v) => `$${v.toFixed(2)}`}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Zap size={28} className="opacity-30" />
                <p className="text-sm">No tool data yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent activity + payouts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl card p-6 hover:shadow-md transition">
          <h3 className="text-lg font-medium text-foreground mb-4">Recent activity</h3>
          {recentImpressions.length > 0 ? (
            <div className="space-y-3">
              {recentImpressions.map((imp) => (
                <div
                  key={imp.id}
                  className="flex items-center justify-between py-3 px-4 rounded-xl bg-muted/50 border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-violet-50 flex items-center justify-center text-primary text-xs font-bold">
                      {imp.advertiserName[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground/90">
                        {imp.advertiserName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {imp.paid ? 'Paid impression' : imp.notPaidReason ?? 'Not paid'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {imp.paid ? (
                      <p className="text-sm font-medium text-emerald-600">
                        +{formatEarning(imp.payoutCents)}
                      </p>
                    ) : (
                      <p className="text-sm font-medium text-muted-foreground">Not paid</p>
                    )}
                    <p className="text-xs text-muted-foreground">{timeAgo(imp.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Eye size={32} className="mx-auto mb-3 opacity-30" />
              <p>No impressions yet</p>
              <p className="text-sm mt-1">
                Activity will appear once Prism records your first ad view.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-2xl card p-6 hover:shadow-md transition">
          <h3 className="text-lg font-medium text-foreground mb-4">Payouts</h3>
          {payouts.length > 0 ? (
            <div className="space-y-3">
              {payouts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-3 px-4 rounded-xl bg-muted/50 border border-border"
                >
                  <div className="flex items-center gap-3">
                    {p.status === 'paid' ? (
                      <CheckCircle2 size={18} className="text-emerald-600" />
                    ) : (
                      <Clock size={18} className="text-amber-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground/90">
                        {formatCents(p.amountCents)}
                      </p>
                      <p className="text-xs text-muted-foreground">{timeAgo(p.createdAt)}</p>
                    </div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet size={32} className="mx-auto mb-3 opacity-30" />
              <p>No payouts yet</p>
              <p className="text-sm mt-1">
                Request your first withdrawal once you hit $20.00.
              </p>
            </div>
          )}
        </div>
      </div>

      {showWithdraw && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowWithdraw(false)
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-semibold text-foreground">Withdraw earnings</h3>
              <button
                onClick={() => setShowWithdraw(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Available: {formatCents(stats.balanceCents)}
            </p>
            <label className="block text-sm text-muted-foreground mb-1">Amount</label>
            <div className="relative mb-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <input
                type="number"
                min="20"
                step="0.01"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="w-full rounded-lg border border-border bg-input pl-7 pr-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
            <button
              type="button"
              onClick={() => setWithdrawAmount((stats.balanceCents / 100).toFixed(2))}
              className="text-xs text-primary hover:underline mb-4"
            >
              Withdraw full balance
            </button>
            {(() => {
              const amt = Math.round((parseFloat(withdrawAmount) || 0) * 100)
              const tooLow = amt < 2000
              const tooHigh = amt > stats.balanceCents
              return (
                <>
                  <div className="rounded-xl bg-muted/50 border border-border p-4 space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span>{formatCents(amt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payout fee</span>
                      <span className="text-emerald-600">Free</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2 font-medium">
                      <span>You receive</span>
                      <span>{formatCents(amt)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Estimated arrival</span>
                      <span>1–3 business days</span>
                    </div>
                  </div>
                  {tooLow && <p className="text-xs text-amber-600 mb-2">Minimum withdrawal is $20.00.</p>}
                  {tooHigh && <p className="text-xs text-red-500 mb-2">Exceeds your available balance.</p>}
                  <Button
                    size="md"
                    className="w-full"
                    disabled={withdrawing || tooLow || tooHigh}
                    onClick={() => handleWithdraw(amt)}
                  >
                    {withdrawing ? 'Submitting…' : `Withdraw ${formatCents(amt)}`}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    Paid to your saved payout method after review.
                  </p>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </DashboardShell>
  )
}

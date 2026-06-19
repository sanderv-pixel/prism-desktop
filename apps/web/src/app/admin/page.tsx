'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Eye,
  Users,
  DollarSign,
  CreditCard,
  Megaphone,
  MousePointerClick,
  TrendingUp,
  AlertTriangle,
  Activity,
  Clock,
  Globe,
} from 'lucide-react'
import { useAdminSecret } from '@/components/admin/AdminSecretProvider'
import { adminHeaders } from '@/lib/admin/fetch'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/Button'

interface Metrics {
  visits: {
    today: number
    week: number
    month: number
    uniqueToday: number
    active: number
    activeByCountry: { country: string; count: number }[]
  }
  signups: { total: number; today: number }
  revenue: { today: number; month: number; total: number; spend: number; held: number }
  payouts: { pending: number; pendingCents: number; paid: number; paidCents: number }
  campaigns: { active: number; pendingReview: number; totalSpend: number }
  impressions: { today: number; total: number }
  clicks: { today: number; total: number }
  conversions: { today: number; total: number; valueToday: number; valueTotal: number }
  anomalies: { total: number; bySeverity: Record<string, number> }
}

interface AuditLog {
  id: string
  action: string
  actorEmail?: string
  targetType: string
  targetId: string
  metadata?: Record<string, unknown>
  createdAt: string
}

interface MetricsResponse {
  metrics: Metrics
  auditLogs: AuditLog[]
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US').format(n)
}

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  href,
  trend,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  href?: string
  trend?: 'up' | 'down' | 'neutral'
}) {
  const Wrapper = href ? Link : 'div'
  return (
    <Wrapper
      href={href as string}
      className="surface p-5 hover:shadow-md transition block"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold mt-2">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div
          className={`p-2.5 rounded-xl ${
            trend === 'up'
              ? 'bg-emerald-50 text-emerald-600'
              : trend === 'down'
              ? 'bg-red-50 text-red-600'
              : 'bg-primary/10 text-primary'
          }`}
        >
          <Icon size={20} />
        </div>
      </div>
    </Wrapper>
  )
}

export default function AdminDashboardPage() {
  const { adminSecret, setAdminSecret } = useAdminSecret()
  const [data, setData] = useState<MetricsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [headerPresent, setHeaderPresent] = useState<boolean | null>(null)
  const [secretLengths, setSecretLengths] = useState({ received: 0, expected: 0 })
  const [inputSecret, setInputSecret] = useState(adminSecret)
  const [showSecret, setShowSecret] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setUserEmail(data.user?.email ?? ''))
  }, [])

  // Fail-safe: if the request hangs, stop showing the spinner after 8s.
  useEffect(() => {
    if (!loading) return
    const timer = setTimeout(() => setLoading(false), 8000)
    return () => clearTimeout(timer)
  }, [loading])

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const res = await fetch('/api/admin/metrics', {
          headers: adminHeaders(adminSecret),
        })
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          setErrorCode(json.code ?? '')
          setHeaderPresent(json.headerPresent ?? null)
          setSecretLengths({
            received: json.receivedLength ?? 0,
            expected: json.expectedLength ?? 0,
          })
          throw new Error(json.error ?? 'Failed to load metrics')
        }
        setData(await res.json())
        setErrorCode('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [adminSecret])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-pulse text-muted-foreground">Loading dashboard…</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-600 space-y-4">
        <div className="space-y-1">
          <p className="font-medium">{error || 'Could not load dashboard'}</p>
          {errorCode && (
            <p className="text-xs font-mono text-red-500/80">Error code: {errorCode}</p>
          )}
          {userEmail && (
            <p className="text-xs text-red-500/80">Signed in as: {userEmail}</p>
          )}
          {headerPresent !== null && (
            <p className="text-xs text-red-500/80">
              X-Admin-Secret header sent: {headerPresent ? 'yes' : 'no'}
            </p>
          )}
          {errorCode === 'ADMIN_SECRET_REQUIRED' && headerPresent && (
            <p className="text-xs text-red-500/80">
              Secret length received: {secretLengths.received} (expected: {secretLengths.expected})
            </p>
          )}
        </div>
        {(errorCode === 'ADMIN_EMAIL_REQUIRED' || errorCode === 'ADMIN_SECRET_REQUIRED' || !errorCode) && (
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>
              Make sure you are signed in with an email listed in{' '}
              <code className="bg-red-100 px-1 rounded">PRISM_ADMIN_EMAILS</code>.
            </li>
            <li>
              If you are in production, both env vars must be set on the server.
            </li>
          </ul>
        )}

        {(errorCode === 'ADMIN_SECRET_REQUIRED' || !errorCode) && (
          <div className="pt-2 space-y-3">
            <label className="block text-sm font-medium">
              Enter the admin secret ({' '}
              <code className="bg-red-100 px-1 rounded">PRISM_ADMIN_SECRET</code>)
            </label>
            <div className="flex gap-2">
              <input
                type={showSecret ? 'text' : 'password'}
                value={inputSecret}
                onChange={(e) => setInputSecret(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setAdminSecret(inputSecret.trim())
                    setLoading(true)
                  }
                }}
                placeholder="Admin secret"
                className="flex-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition"
              >
                {showSecret ? 'Hide' : 'Show'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdminSecret(inputSecret.trim())
                  setLoading(true)
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition"
              >
                Unlock
              </button>
            </div>
            <p className="text-xs text-red-500/80">
              Stored only in this browser session. You can also enter it in the left sidebar.
            </p>
          </div>
        )}
      </div>
    )
  }

  const { metrics, auditLogs } = data

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Overview</p>
          <h1 className="text-2xl font-semibold">Company dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button href="/admin/campaigns" size="sm">
            Review campaigns
          </Button>
          <Button href="/admin/payouts" variant="outline" size="sm">
            Review payouts
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Visitors today"
          value={formatNumber(metrics.visits.today)}
          sub={`${formatNumber(metrics.visits.uniqueToday)} unique · ${formatNumber(
            metrics.visits.month
          )} this month`}
          icon={Eye}
          href="/admin/analytics"
        />
        <MetricCard
          label="Waitlist signups"
          value={formatNumber(metrics.signups.total)}
          sub={`${formatNumber(metrics.signups.today)} today`}
          icon={Users}
        />
        <MetricCard
          label="Revenue today"
          value={formatCents(metrics.revenue.today)}
          sub={`${formatCents(metrics.revenue.month)} this month · ${formatCents(
            metrics.revenue.total
          )} lifetime`}
          icon={DollarSign}
          trend="up"
        />
        <MetricCard
          label="Held advertiser balance"
          value={formatCents(metrics.revenue.held)}
          sub={`${formatCents(metrics.revenue.spend)} spent on ads`}
          icon={CreditCard}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Active campaigns"
          value={formatNumber(metrics.campaigns.active)}
          sub={`${formatNumber(metrics.campaigns.pendingReview)} pending review`}
          icon={Megaphone}
          href="/admin/campaigns"
        />
        <MetricCard
          label="Impressions today"
          value={formatNumber(metrics.impressions.today)}
          sub={`${formatNumber(metrics.impressions.total)} total`}
          icon={Activity}
        />
        <MetricCard
          label="Clicks today"
          value={formatNumber(metrics.clicks.today)}
          sub={`${formatNumber(metrics.clicks.total)} total`}
          icon={MousePointerClick}
        />
        <MetricCard
          label="Conversions today"
          value={formatNumber(metrics.conversions.today)}
          sub={`${formatCents(metrics.conversions.valueToday)} value`}
          icon={TrendingUp}
          trend="up"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Active visitors"
          value={formatNumber(metrics.visits.active)}
          sub="Last 15 minutes"
          icon={Activity}
        />
        <div className="surface p-5 sm:col-span-1 lg:col-span-3">
          <div className="flex items-center gap-2 mb-3">
            <Globe size={18} className="text-primary" />
            <h3 className="font-medium">Active visitors by country</h3>
          </div>
          {metrics.visits.activeByCountry.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active visitors right now.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {metrics.visits.activeByCountry.map(({ country, count }) => (
                <span
                  key={country}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                >
                  <span className="font-semibold">{country}</span>
                  <span className="text-primary/70">{count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="surface p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <DollarSign size={18} className="text-primary" />
              Payouts
            </h2>
            <Link href="/admin/payouts" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pending review</span>
              <span className="font-semibold">
                {formatNumber(metrics.payouts.pending)} · {formatCents(metrics.payouts.pendingCents)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Paid out lifetime</span>
              <span className="font-semibold">
                {formatNumber(metrics.payouts.paid)} · {formatCents(metrics.payouts.paidCents)}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{
                  width: `${
                    metrics.payouts.pendingCents + metrics.payouts.paidCents > 0
                      ? (metrics.payouts.paidCents /
                          (metrics.payouts.pendingCents + metrics.payouts.paidCents)) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="surface p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              Open anomalies
            </h2>
            <Link href="/admin/anomalies" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <p className="text-3xl font-semibold">{formatNumber(metrics.anomalies.total)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {['critical', 'high', 'medium', 'low'].map((sev) => {
              const count = metrics.anomalies.bySeverity[sev] ?? 0
              if (!count) return null
              const colors: Record<string, string> = {
                critical: 'bg-red-100 text-red-700 border-red-200',
                high: 'bg-orange-100 text-orange-700 border-orange-200',
                medium: 'bg-amber-100 text-amber-700 border-amber-200',
                low: 'bg-blue-100 text-blue-700 border-blue-200',
              }
              return (
                <span
                  key={sev}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border ${colors[sev]}`}
                >
                  {sev}: {count}
                </span>
              )
            })}
            {metrics.anomalies.total === 0 && (
              <span className="text-sm text-muted-foreground">No open anomalies</span>
            )}
          </div>
        </div>

        <div className="surface p-6 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Clock size={18} className="text-primary" />
              Recent audit log
            </h2>
            <Link href="/admin/audit-logs" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3 max-h-64 overflow-auto pr-1">
            {auditLogs.length === 0 && (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            )}
            {auditLogs.map((log) => (
              <div key={log.id} className="text-sm border-b border-border/50 pb-2 last:border-0">
                <p className="font-medium">{log.action}</p>
                <p className="text-xs text-muted-foreground">
                  {log.actorEmail ?? 'system'} · {log.targetType} {log.targetId.slice(0, 8)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

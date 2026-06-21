'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import {
  formatCurrency,
  isZeroDecimalCurrency,
} from '@/lib/currency'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { StatCard } from '@/components/dashboard/StatCard'
import { DateRangePicker } from '@/components/dashboard/DateRangePicker'
import { LineChart } from '@/components/dashboard/LineChart'
import { BarChart } from '@/components/dashboard/BarChart'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { Button } from '@/components/Button'
import { PaymentElementCheckout } from '@/components/PaymentElementCheckout'
import {
  Wallet,
  Eye,
  MousePointerClick,
  Target,
  TrendingUp,
  Zap,
  AlertCircle,
  Plus,
  Pause,
  Play,
  Pencil,
  Trash2,
  FlaskConical,
  Search,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  BarChart3,
  X,
} from 'lucide-react'

interface CurrencyConfig {
  currency: string
  rate: number
  minLocalAmount: number
  baseMinUsdCents: number
  rates?: Record<string, number>
}

type RangeValue = 7 | 30 | 90 | 'all'

interface AdvertiserStats {
  advertiser: {
    id: string
    name: string
    status: string
    subscriptionStatus: string
    balanceCents: number
    lifetimeDepositsCents: number
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
    roas: number
    conversionValueCents: number
    reach: number
    frequency: number
    activeCampaigns: number
    totalCampaigns: number
    spendChange: number
  }
  chartData: { date: string; spend: number; impressions: number; clicks: number }[]
  contextBreakdown: { name: string; impressions: number; spend: number; clicks: number }[]
  sourceBreakdown: { name: string; impressions: number; spend: number }[]
  campaigns: Campaign[]
}

interface Campaign {
  id: string
  title: string
  status: string
  objective: string
  bidType: string
  budgetCents: number
  spentCents: number
  maxBidCpm: number
  maxBidCpc: number | null
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

type SortKey = 'budgetCents' | 'spentCents' | 'impressions' | 'clicks' | 'ctr' | 'cpm'
type SortDir = 'asc' | 'desc'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
]

function getTopUpPresets(currency: string): number[] {
  switch (currency.toUpperCase()) {
    case 'AED':
      return [40, 100, 200, 500, 1000, 2000]
    case 'EUR':
    case 'USD':
    default:
      return [10, 25, 50, 100, 250, 500]
  }
}

function getDefaultTopUpAmount(currency: string): number {
  switch (currency.toUpperCase()) {
    case 'AED':
      return 40
    case 'EUR':
    case 'USD':
    default:
      return 10
  }
}

const LOW_BALANCE_CENTS = 2500
const PAGE_SIZE = 10

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US').format(n)
}

function csvCell(value: string | number) {
  const s = String(value)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function exportCampaignsCsv(rows: Campaign[]) {
  const header = [
    'Title',
    'Status',
    'Objective',
    'Budget',
    'Spent',
    'Bid',
    'Impressions',
    'Clicks',
    'CTR',
    'CPM',
  ]
  const lines = [
    header.join(','),
    ...rows.map((c) =>
      [
        csvCell(c.title),
        csvCell(c.status),
        csvCell(c.objective),
        csvCell(formatCents(c.budgetCents)),
        csvCell(formatCents(c.spentCents)),
        csvCell(
          c.bidType === 'cpc'
            ? `${formatCents(c.maxBidCpc ?? 0)} CPC`
            : `${formatCents(c.maxBidCpm)} CPM`
        ),
        csvCell(c.impressions),
        csvCell(c.clicks),
        csvCell(`${c.ctr}%`),
        csvCell(formatCents(c.cpm)),
      ].join(',')
    ),
  ]
  const csv = lines.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', 'campaigns.csv')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function AdvertiserDashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState<AdvertiserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [redirecting, setRedirecting] = useState(false)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [topUpAmount, setTopUpAmount] = useState('50')
  const [showTopUp, setShowTopUp] = useState(false)
  const [topUpLoading, setTopUpLoading] = useState(false)
  const [currencyConfig, setCurrencyConfig] = useState<CurrencyConfig | null>(null)
  const [displayCurrency, setDisplayCurrency] = useState('USD')
  const [testModeEnabled, setTestModeEnabled] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [range, setRange] = useState<RangeValue>(30)

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('spentCents')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)

  const formatMoney = useCallback(
    (cents: number) => {
      const currency = displayCurrency
      const rate = currencyConfig?.rates?.[currency] ?? 1
      const major = (cents / 100) * rate
      return new Intl.NumberFormat('en', { style: 'currency', currency }).format(major)
    },
    [displayCurrency, currencyConfig]
  )

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/advertiser-stats?range=${range}`)
      if (!res.ok) {
        const err = await res.json()
        if (res.status === 404) {
          setRedirecting(true)
          router.push('/advertiser/onboarding')
          return
        }
        throw new Error(err.error ?? 'Failed to load dashboard')
      }
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [range, router])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    fetch('/api/geo/currency')
      .then((res) => res.json())
      .then((config: CurrencyConfig) => {
        setCurrencyConfig(config)
        setTopUpAmount(String(getDefaultTopUpAmount(config.currency)))
        const saved = typeof window !== 'undefined' ? window.localStorage.getItem('prism-display-currency') : null
        const initial = saved && config.rates?.[saved] ? saved : config.currency
        setDisplayCurrency(initial)
      })
      .catch((err) => console.error('Failed to load currency config:', err))

    fetch('/api/checkout/test')
      .then((res) => res.json())
      .then((data) => setTestModeEnabled(Boolean(data.enabled)))
      .catch((err) => console.error('Failed to load test checkout config:', err))

    const params = new URLSearchParams(window.location.search)
    const testSessionId = params.get('test_session_id')
    if (params.get('test_checkout') === 'success' && testSessionId) {
      verifyTestSession(testSessionId)
    }

    if (params.get('success') === '1') {
      const paymentIntentId = params.get('payment_intent')
      const finalize = async () => {
        if (paymentIntentId) {
          try {
            const res = await fetch('/api/checkout/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentIntentId }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Payment verification failed.')
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Payment verification failed.')
          }
        }
        setPaymentSuccess(true)
        setCheckoutClientSecret(null)
        await fetchStats()
        router.replace('/advertiser/dashboard', { scroll: false })
      }
      finalize()
    }

    if (params.get('canceled') === '1') {
      setError('Payment was canceled.')
      router.replace('/advertiser/dashboard', { scroll: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function handleTopUp() {
    const currency = currencyConfig?.currency ?? 'USD'
    const minLocalAmount = currencyConfig?.minLocalAmount ?? 1000

    const major = Math.round(parseFloat(topUpAmount) || 0)
    const localMinor = isZeroDecimalCurrency(currency) ? major : major * 100
    if (!localMinor || localMinor < minLocalAmount) {
      setError(`Minimum top-up is ${formatCurrency(minLocalAmount, currency)}.`)
      return
    }
    setTopUpLoading(true)
    setCheckoutLoading(true)
    setError('')
    setCheckoutClientSecret(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'payment',
          uiMode: 'embedded',
          amount: localMinor,
          currency,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Top-up failed')
      if (json.clientSecret) {
        setCheckoutClientSecret(json.clientSecret)
      } else if (json.url) {
        window.location.href = json.url
      } else {
        throw new Error('No checkout session returned')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Top-up failed')
    } finally {
      setTopUpLoading(false)
      setCheckoutLoading(false)
    }
  }

  async function handleTestDeposit() {
    setTestLoading(true)
    setError('')
    try {
      const res = await fetch('/api/checkout/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents: 1000 }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Test deposit failed')
      if (json.url) {
        window.location.href = json.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test deposit failed')
      setTestLoading(false)
    }
  }

  async function verifyTestSession(sessionId: string) {
    setVerifyLoading(true)
    setError('')
    try {
      const res = await fetch('/api/checkout/test/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to verify test deposit')
      await fetchStats()
      router.replace('/advertiser/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify test deposit')
    } finally {
      setVerifyLoading(false)
    }
  }

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

  async function deleteCampaign(id: string) {
    if (!confirm('Are you sure you want to delete this campaign?')) return
    setActionLoading(id)
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete campaign')
      await fetchStats()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setActionLoading(null)
    }
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
    setPage(1)
  }

  function SortHeader({ label, sortKey: key }: { label: string; sortKey: SortKey }) {
    const active = sortKey === key
    return (
      <button
        onClick={() => handleSort(key)}
        className="flex items-center gap-1 font-medium hover:text-foreground transition"
      >
        {label}
        {active ? (
          sortDir === 'asc' ? (
            <ArrowUp size={12} className="text-primary" />
          ) : (
            <ArrowDown size={12} className="text-primary" />
          )
        ) : (
          <ArrowUpDown size={12} className="opacity-40" />
        )}
      </button>
    )
  }

  if (authLoading || loading || redirecting) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-96">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Zap size={18} className="animate-pulse text-primary" />
            {redirecting ? 'Redirecting to onboarding…' : 'Loading advertiser dashboard…'}
          </div>
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
            <p className="font-medium">Failed to load dashboard</p>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        </div>
      </DashboardShell>
    )
  }

  const { advertiser, stats, chartData, contextBreakdown, sourceBreakdown, campaigns } = data
  const isActive = advertiser.status === 'active'

  const periodSpendCents = chartData.reduce(
    (sum, d) => sum + Math.round(d.spend * 100),
    0
  )

  const filteredCampaigns = (() => {
    const q = searchQuery.trim().toLowerCase()
    return campaigns.filter((c) => {
      const matchesSearch = !q || c.title.toLowerCase().includes(q)
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter
      return matchesSearch && matchesStatus
    })
  })()

  const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
    const aVal = a[sortKey]
    const bVal = b[sortKey]
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const totalPages = Math.max(1, Math.ceil(sortedCampaigns.length / PAGE_SIZE))
  const pagedCampaigns = sortedCampaigns.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const lineChartData = chartData.map((d) => ({
    date: d.date.slice(5),
    spend: d.spend,
    impressions: d.impressions,
  }))

  const contextBarData = contextBreakdown.map((d) => ({
    label: d.name,
    value: d.impressions,
  }))

  return (
    <DashboardShell>
      {paymentSuccess && (
        <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
          <TrendingUp size={18} className="text-emerald-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-emerald-800">Payment successful</p>
            <p className="text-sm text-emerald-700">
              Your wallet has been topped up. It may take a few seconds to reflect.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center text-lg font-medium shrink-0">
            {advertiser.name?.trim().charAt(0).toLowerCase() || 'a'}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground leading-tight">{advertiser.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge status={advertiser.status} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <a href="/advertiser/campaigns" className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition">Campaigns</a>
          <a href="/advertiser/billing" className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition">Billing</a>
          <a href="/advertiser/conversions" className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition">Tracking</a>
          <a href="/advertiser/settings" className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition">Settings</a>
          <a href="/dashboard" className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition">Creator</a>
          <Button size="md" href="/advertiser/campaigns/new" disabled={!isActive} className="ml-1.5">
            <Plus size={16} className="mr-2" />
            New campaign
          </Button>
        </div>
      </div>

      {!isActive && (
        <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-500 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Top up your wallet to go live</p>
            <p className="text-sm text-amber-700">
              Deposit funds to activate your advertiser account. Your campaign budget is a spend
              cap; the wallet is drawn down only as ads actually deliver.
            </p>
          </div>
        </div>
      )}

      {isActive && advertiser.balanceCents <= 0 && stats.activeCampaigns > 0 && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-500 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Campaigns paused — wallet empty</p>
            <p className="text-sm text-red-700">
              You have {stats.activeCampaigns} active campaign{stats.activeCampaigns === 1 ? '' : 's'},
              but your wallet is out of funds so they aren&apos;t delivering. Top up to resume; delivery
              restarts automatically.
            </p>
          </div>
        </div>
      )}

      {isActive && advertiser.balanceCents > 0 && advertiser.balanceCents < LOW_BALANCE_CENTS && (
        <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-500 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Low balance</p>
            <p className="text-sm text-amber-700">
              Your wallet is running low. Top up to keep campaigns running and create new ones.
            </p>
          </div>
        </div>
      )}

      {/* Wallet strip */}
      <div className="rounded-xl border border-border bg-white p-5 md:p-6 mb-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <p className="text-sm text-muted-foreground mb-0.5">Wallet balance</p>
            <p className="text-3xl md:text-4xl font-semibold text-foreground leading-none">
              {formatMoney(advertiser.balanceCents)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {formatMoney(advertiser.lifetimeDepositsCents)} deposited · {formatMoney(stats.totalSpendCents)} spent ·{' '}
              {formatMoney(stats.totalBudgetCents)} allocated
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/advertiser/billing"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs rounded-full bg-violet-50 text-primary px-3 py-1.5 hover:bg-violet-100 transition"
            >
              <RefreshCw size={13} /> Auto-recharge
            </a>
            <select
              value={displayCurrency}
              onChange={(e) => {
                const value = e.target.value
                setDisplayCurrency(value)
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem('prism-display-currency', value)
                }
              }}
              className="text-xs rounded-md border border-border bg-input px-2 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="AED">AED</option>
            </select>
            <Button type="button" size="md" variant="outline" onClick={() => setShowTopUp((v) => !v)}>
              <Wallet size={16} className="mr-2" /> Top up
            </Button>
          </div>
        </div>

        {showTopUp && (
          <div className="mt-5 pt-5 border-t border-border">
            <div className="flex flex-wrap gap-2 mb-3">
              {getTopUpPresets(currencyConfig?.currency ?? 'USD').map((preset) => {
                const currency = currencyConfig?.currency ?? 'USD'
                const localMinor = isZeroDecimalCurrency(currency) ? preset : preset * 100
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTopUpAmount(String(preset))}
                    className={`text-xs px-3 py-1.5 rounded-full border transition ${
                      topUpAmount === String(preset)
                        ? 'bg-violet-50 border-violet-200 text-primary'
                        : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {formatCurrency(localMinor, currency)}
                  </button>
                )
              })}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {currencyConfig?.currency ?? 'USD'}
                </span>
                <input
                  type="number"
                  min={getDefaultTopUpAmount(currencyConfig?.currency ?? 'USD')}
                  step="1"
                  required
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full rounded-lg border border-border bg-input pl-[3.5rem] pr-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
              <Button type="button" size="md" disabled={topUpLoading} onClick={handleTopUp}>
                {topUpLoading
                  ? 'Loading checkout…'
                  : `Top up ${formatCurrency(
                      isZeroDecimalCurrency(currencyConfig?.currency ?? 'USD')
                        ? Math.round(Number(topUpAmount || 0))
                        : Math.round(Number(topUpAmount || 0) * 100),
                      currencyConfig?.currency ?? 'USD'
                    )}`}
              </Button>
            </div>
            {currencyConfig && (
              <p className="text-xs text-muted-foreground mt-2">
                ≈ ${(Number(topUpAmount || 0) / currencyConfig.rate).toFixed(2)} USD
              </p>
            )}
            {testModeEnabled && (
              <button
                type="button"
                onClick={handleTestDeposit}
                disabled={testLoading || verifyLoading}
                className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 transition disabled:opacity-50"
              >
                <FlaskConical size={16} />
                {testLoading ? 'Redirecting…' : 'Test: add $10 with Stripe test card'}
              </button>
            )}
          </div>
        )}

        {checkoutLoading && !checkoutClientSecret && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Zap size={16} className="animate-pulse text-primary" /> Loading checkout…
          </div>
        )}

        {checkoutClientSecret && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setCheckoutClientSecret(null)
            }}
          >
            <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Complete your top-up</h3>
                <button
                  type="button"
                  onClick={() => setCheckoutClientSecret(null)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                >
                  <X size={18} />
                </button>
              </div>
              <PaymentElementCheckout
                clientSecret={checkoutClientSecret}
                returnUrl={`${typeof window !== 'undefined' ? window.location.origin : 'https://goprism.dev'}/advertiser/dashboard?success=1`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp size={14} className="text-emerald-600" />
          <span className="text-emerald-600">
            {stats.spendChange >= 0 ? '+' : ''}
            {stats.spendChange}%
          </span>
          <span>vs last period</span>
          <span className="text-border">·</span>
          <span>
            {stats.activeCampaigns}/{stats.totalCampaigns} active
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={range} onChange={setRange} />
          <a
            href="/api/advertiser/export"
            download
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted whitespace-nowrap"
          >
            <Download size={15} /> Export CSV
          </a>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Wallet}
          label="Spend"
          value={formatMoney(periodSpendCents)}
          change={stats.spendChange}
        />
        <StatCard icon={Eye} label="Impressions" value={formatNumber(stats.totalImpressions)} />
        <StatCard icon={MousePointerClick} label="Clicks" value={formatNumber(stats.totalClicks)} />
        <StatCard icon={Target} label="CTR" value={`${stats.ctr}%`} />
        <StatCard icon={TrendingUp} label="CPM" value={formatMoney(stats.cpm)} />
        <StatCard icon={Wallet} label="CPC" value={formatMoney(stats.cpc)} />
        <StatCard
          icon={Target}
          label="CPA"
          value={stats.totalConversions > 0 ? formatMoney(stats.cpa) : '—'}
        />
        <StatCard
          icon={TrendingUp}
          label="ROAS"
          value={stats.conversionValueCents > 0 ? `${stats.roas.toFixed(2)}x` : '—'}
        />
        <StatCard
          icon={Eye}
          label="Reach / Freq"
          value={`${formatNumber(stats.reach)} / ${stats.frequency.toFixed(1)}`}
        />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-white p-6">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">Spend & impressions</h3>
            <p className="text-sm text-muted-foreground">Daily trends for the selected period</p>
          </div>
          <div className="h-72">
            {stats.totalImpressions > 0 ? (
              <LineChart
                data={lineChartData}
                xAxisKey="date"
                lines={[
                  { key: 'spend', label: 'Spend', color: '#8b5cf6', yAxisId: 'left' },
                  { key: 'impressions', label: 'Impressions', color: '#06b6d4', yAxisId: 'right' },
                ]}
                valueFormatter={(v) => '$' + v.toFixed(2)}
                rightValueFormatter={(v) => v.toLocaleString()}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                <TrendingUp size={32} className="opacity-30" />
                <p>No campaign activity yet.</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-6 flex flex-col">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">Context breakdown</h3>
            <p className="text-sm text-muted-foreground">Impressions by context</p>
          </div>
          <div className="flex-1 min-h-56">
            {contextBarData.length > 0 ? (
              <BarChart
                data={contextBarData}
                valueFormatter={(v) => v.toLocaleString()}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Target size={32} className="opacity-30" />
                <p>No context data yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Source breakdown — which app each view came from */}
      <div className="rounded-xl border border-border bg-white p-6">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-foreground">Where views came from</h3>
          <p className="text-sm text-muted-foreground">Impressions by surface (Claude, Cursor, Codex, terminal)</p>
        </div>
        {sourceBreakdown.length > 0 ? (
          <div className="space-y-4">
            {sourceBreakdown.map((s) => {
              const pct = stats.totalImpressions > 0 ? (s.impressions / stats.totalImpressions) * 100 : 0
              return (
                <div key={s.name}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium text-foreground">{s.name}</span>
                    <span className="text-muted-foreground">
                      {s.impressions.toLocaleString()} · {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#8b5cf6' }} />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground gap-3 py-10">
            <Target size={32} className="opacity-30" />
            <p>No source data yet</p>
          </div>
        )}
      </div>

      {/* Campaigns table */}
      <div className="rounded-xl border border-border bg-white overflow-hidden">
        <div className="p-4 md:p-6 border-b border-border flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">Campaigns</h3>
              <p className="text-sm text-muted-foreground">Manage active and draft campaigns</p>
            </div>
            <Button size="sm" href="/advertiser/campaigns/new" disabled={!isActive}>
              <Plus size={14} className="mr-2" />
              Create campaign
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Search campaigns…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(1)
                }}
                className="w-full rounded-lg border border-border bg-input pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
            <div className="flex items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCampaignsCsv(sortedCampaigns)}
                disabled={sortedCampaigns.length === 0}
              >
                <Download size={14} className="mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>

        {pagedCampaigns.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 font-medium">Campaign</th>
                    <th className="px-6 py-3 font-medium">Objective</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3">
                      <SortHeader label="Budget" sortKey="budgetCents" />
                    </th>
                    <th className="px-6 py-3">
                      <SortHeader label="Spent" sortKey="spentCents" />
                    </th>
                    <th className="px-6 py-3 font-medium">Bid</th>
                    <th className="px-6 py-3">
                      <SortHeader label="Imp." sortKey="impressions" />
                    </th>
                    <th className="px-6 py-3">
                      <SortHeader label="Clicks" sortKey="clicks" />
                    </th>
                    <th className="px-6 py-3">
                      <SortHeader label="CTR" sortKey="ctr" />
                    </th>
                    <th className="px-6 py-3">
                      <SortHeader label="CPM" sortKey="cpm" />
                    </th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pagedCampaigns.map((campaign) => {
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
                        <td className="px-6 py-4 text-foreground/80 capitalize">
                          {campaign.objective}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={campaign.status} />
                        </td>
                        <td className="px-6 py-4 text-foreground/80">
                          {formatMoney(campaign.budgetCents)}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-foreground/80">
                              {formatMoney(campaign.spentCents)}
                            </p>
                            <div className="w-24 h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-foreground/80">
                          {campaign.bidType === 'cpc' ? (
                            <span>
                              {formatMoney(campaign.maxBidCpc ?? 0)}{' '}
                              <span className="text-xs text-muted-foreground">CPC</span>
                            </span>
                          ) : (
                            <span>
                              {formatMoney(campaign.maxBidCpm)}{' '}
                              <span className="text-xs text-muted-foreground">CPM</span>
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-foreground/80">
                          {formatNumber(campaign.impressions)}
                        </td>
                        <td className="px-6 py-4 text-foreground/80">
                          {formatNumber(campaign.clicks)}
                        </td>
                        <td className="px-6 py-4 text-foreground/80">{campaign.ctr}%</td>
                        <td className="px-6 py-4 text-foreground/80">
                          {formatMoney(campaign.cpm)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() =>
                                router.push(`/advertiser/campaigns/${campaign.id}/analytics`)
                              }
                              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition"
                              title="View analytics"
                            >
                              <BarChart3 size={14} />
                            </button>
                            {(campaign.status === 'active' || campaign.status === 'pending') && (
                              <button
                                onClick={() => updateCampaign(campaign.id, 'paused')}
                                disabled={actionLoading === campaign.id}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition disabled:opacity-50"
                                title="Pause"
                              >
                                <Pause size={14} />
                              </button>
                            )}
                            {campaign.status === 'paused' && (
                              <button
                                onClick={() => updateCampaign(campaign.id, 'pending_review')}
                                disabled={actionLoading === campaign.id}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 transition disabled:opacity-50"
                                title="Submit for review"
                              >
                                <Play size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => router.push(`/advertiser/campaigns/${campaign.id}`)}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => deleteCampaign(campaign.id)}
                              disabled={actionLoading === campaign.id}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {sortedCampaigns.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, sortedCampaigns.length)} of {sortedCampaigns.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:pointer-events-none transition"
                >
                  <ChevronLeft size={14} />
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:pointer-events-none transition"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-12 text-center text-muted-foreground">
            <Target size={40} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium text-foreground/90 mb-1">No campaigns found</p>
            <p className="text-sm mb-6">Try adjusting filters or create your first campaign.</p>
            <Button href="/advertiser/campaigns/new" disabled={!isActive}>
              <Plus size={16} className="mr-2" />
              Create campaign
            </Button>
          </div>
        )}
      </div>
    </DashboardShell>
  )
}

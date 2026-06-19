'use client'

import { useEffect, useState } from 'react'
import {
  Users,
  Eye,
  UserPlus,
  MousePointerClick,
  Clock,
  LogOut,
  Monitor,
  Globe,
  TrendingUp,
} from 'lucide-react'
import { useAdminSecret } from '@/components/admin/AdminSecretProvider'
import { adminHeaders } from '@/lib/admin/fetch'
import { LineChart } from '@/components/dashboard/LineChart'
import { BarChart } from '@/components/dashboard/BarChart'

interface GaOverview {
  users: number
  sessions: number
  newUsers: number
  screenPageViews: number
  averageSessionDuration: number
  bounceRate: number
}

interface GaTimeSeriesPoint {
  date: string
  users: number
  sessions: number
  screenPageViews: number
}

interface GaTopPage {
  pagePath: string
  pageTitle: string
  sessions: number
  screenPageViews: number
}

interface GaSource {
  source: string
  medium: string
  sessions: number
  users: number
}

interface GaCountry {
  country: string
  sessions: number
  users: number
}

interface GaDevice {
  deviceCategory: string
  sessions: number
  users: number
}

interface GaAnalyticsData {
  overview: GaOverview
  timeSeries: GaTimeSeriesPoint[]
  topPages: GaTopPage[]
  sources: GaSource[]
  countries: GaCountry[]
  devices: GaDevice[]
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US').format(Math.round(n))
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatPercent(n: number) {
  return `${(n * 100).toFixed(1)}%`
}

const statCards = (overview: GaOverview) => [
  {
    label: 'Users',
    value: formatNumber(overview.users),
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    label: 'Sessions',
    value: formatNumber(overview.sessions),
    icon: Eye,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
  },
  {
    label: 'New users',
    value: formatNumber(overview.newUsers),
    icon: UserPlus,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    label: 'Page views',
    value: formatNumber(overview.screenPageViews),
    icon: MousePointerClick,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    label: 'Avg. session',
    value: formatDuration(overview.averageSessionDuration),
    icon: Clock,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
  },
  {
    label: 'Bounce rate',
    value: formatPercent(overview.bounceRate),
    icon: LogOut,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
]

export default function AdminGaAnalyticsPage() {
  const { adminSecret } = useAdminSecret()
  const [days, setDays] = useState(30)
  const [data, setData] = useState<GaAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError('')
        const res = await fetch(`/api/admin/ga-analytics?days=${days}`, {
          headers: adminHeaders(adminSecret),
        })

        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(json.error ?? 'Failed to load GA analytics')
        }

        const json = await res.json()
        setData(json.data as GaAnalyticsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [days, adminSecret])

  const chartData =
    data?.timeSeries.map((d) => ({
      label: formatDate(d.date),
      users: d.users,
      sessions: d.sessions,
      views: d.screenPageViews,
    })) ?? []

  const deviceChartData =
    data?.devices.map((d) => ({
      label: d.deviceCategory,
      value: d.sessions,
    })) ?? []

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Google Analytics</p>
          <h1 className="text-2xl font-semibold">GA Insights</h1>
        </div>
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                days === d
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="animate-pulse text-muted-foreground">Loading GA insights…</div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-600">
          {error}
        </div>
      ) : !data ? null : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {statCards(data.overview).map((stat) => (
              <div key={stat.label} className="surface p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg ${stat.bg}`}>
                    <stat.icon size={16} className={stat.color} />
                  </div>
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <div className="text-xl font-semibold">{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="surface p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp size={20} className="text-primary" />
              <h2 className="font-semibold">Traffic trend</h2>
            </div>
            <div className="h-72">
              <LineChart
                data={chartData}
                xAxisKey="label"
                lines={[
                  { key: 'users', label: 'Users', color: '#2563eb' },
                  { key: 'sessions', label: 'Sessions', color: '#7c3aed' },
                  { key: 'views', label: 'Page views', color: '#f59e0b' },
                ]}
              />
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="surface p-6">
              <div className="flex items-center gap-2 mb-4">
                <MousePointerClick size={20} className="text-primary" />
                <h2 className="font-semibold">Top pages</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="pb-2 font-medium">Page</th>
                      <th className="pb-2 font-medium text-right">Views</th>
                      <th className="pb-2 font-medium text-right">Sessions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topPages.map((page) => (
                      <tr key={page.pagePath} className="border-b border-border last:border-0">
                        <td className="py-3">
                          <div className="font-medium truncate max-w-[200px]">
                            {page.pageTitle || page.pagePath}
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {page.pagePath}
                          </div>
                        </td>
                        <td className="py-3 text-right">{formatNumber(page.screenPageViews)}</td>
                        <td className="py-3 text-right">{formatNumber(page.sessions)}</td>
                      </tr>
                    ))}
                    {data.topPages.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-muted-foreground">
                          No page data
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="surface p-6">
              <div className="flex items-center gap-2 mb-4">
                <Globe size={20} className="text-primary" />
                <h2 className="font-semibold">Acquisition sources</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="pb-2 font-medium">Source / Medium</th>
                      <th className="pb-2 font-medium text-right">Sessions</th>
                      <th className="pb-2 font-medium text-right">Users</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sources.map((source) => (
                      <tr
                        key={`${source.source}-${source.medium}`}
                        className="border-b border-border last:border-0"
                      >
                        <td className="py-3">
                          <div className="font-medium">{source.source}</div>
                          <div className="text-xs text-muted-foreground">{source.medium}</div>
                        </td>
                        <td className="py-3 text-right">{formatNumber(source.sessions)}</td>
                        <td className="py-3 text-right">{formatNumber(source.users)}</td>
                      </tr>
                    ))}
                    {data.sources.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-muted-foreground">
                          No source data
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="surface p-6">
              <div className="flex items-center gap-2 mb-4">
                <Globe size={20} className="text-primary" />
                <h2 className="font-semibold">Top countries</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="pb-2 font-medium">Country</th>
                      <th className="pb-2 font-medium text-right">Sessions</th>
                      <th className="pb-2 font-medium text-right">Users</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.countries.map((country) => (
                      <tr key={country.country} className="border-b border-border last:border-0">
                        <td className="py-3 font-medium">{country.country}</td>
                        <td className="py-3 text-right">{formatNumber(country.sessions)}</td>
                        <td className="py-3 text-right">{formatNumber(country.users)}</td>
                      </tr>
                    ))}
                    {data.countries.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-muted-foreground">
                          No country data
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="surface p-6">
              <div className="flex items-center gap-2 mb-4">
                <Monitor size={20} className="text-primary" />
                <h2 className="font-semibold">Devices</h2>
              </div>
              <div className="h-64">
                <BarChart data={deviceChartData} color="#8b5cf6" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

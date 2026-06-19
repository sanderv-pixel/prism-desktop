'use client'

import { useEffect, useState } from 'react'
import { Eye, DollarSign } from 'lucide-react'
import { useAdminSecret } from '@/components/admin/AdminSecretProvider'
import { adminHeaders } from '@/lib/admin/fetch'
import { SimpleBarChart } from '@/components/admin/SimpleBarChart'

interface VisitPoint {
  date: string
  visits: number
  unique_visitors: number
}

interface RevenuePoint {
  date: string
  deposits: number
  spend: number
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(0)}`
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US').format(n)
}

export default function AdminAnalyticsPage() {
  const { adminSecret } = useAdminSecret()
  const [days, setDays] = useState(30)
  const [visits, setVisits] = useState<VisitPoint[]>([])
  const [revenue, setRevenue] = useState<RevenuePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [visitsRes, revenueRes] = await Promise.all([
          fetch(`/api/admin/visitors?days=${days}`, { headers: adminHeaders(adminSecret) }),
          fetch(`/api/admin/revenue?days=${days}`, { headers: adminHeaders(adminSecret) }),
        ])

        if (!visitsRes.ok) {
          const json = await visitsRes.json().catch(() => ({}))
          throw new Error(json.error ?? 'Failed to load visits')
        }
        if (!revenueRes.ok) {
          const json = await revenueRes.json().catch(() => ({}))
          throw new Error(json.error ?? 'Failed to load revenue')
        }

        const visitsJson = await visitsRes.json()
        const revenueJson = await revenueRes.json()
        setVisits((visitsJson.data as VisitPoint[]) ?? [])
        setRevenue((revenueJson.data as RevenuePoint[]) ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [days, adminSecret])

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Analytics</p>
          <h1 className="text-2xl font-semibold">Visitors & revenue</h1>
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
          <div className="animate-pulse text-muted-foreground">Loading analytics…</div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-600">
          {error}
        </div>
      ) : (
        <>
          <div className="surface p-6">
            <div className="flex items-center gap-2 mb-6">
              <Eye size={20} className="text-primary" />
              <h2 className="font-semibold">Visits</h2>
              <span className="text-sm text-muted-foreground ml-auto">
                {formatNumber(visits.reduce((sum, d) => sum + d.visits, 0))} total
              </span>
            </div>
            <SimpleBarChart
              data={visits.map((d) => ({
                label: formatDate(d.date),
                value: d.visits,
              }))}
              color="bg-primary"
              height={200}
            />
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-block w-3 h-3 rounded bg-primary" />
              Total visits
            </div>
          </div>

          <div className="surface p-6">
            <div className="flex items-center gap-2 mb-6">
              <DollarSign size={20} className="text-emerald-600" />
              <h2 className="font-semibold">Revenue</h2>
              <span className="text-sm text-muted-foreground ml-auto">
                {formatCents(revenue.reduce((sum, d) => sum + d.deposits, 0))} deposited
              </span>
            </div>
            <SimpleBarChart
              data={revenue.map((d) => ({
                label: formatDate(d.date),
                value: d.deposits,
              }))}
              color="bg-emerald-500"
              height={200}
              formatValue={formatCents}
            />
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-block w-3 h-3 rounded bg-emerald-500" />
              Advertiser deposits
            </div>
          </div>
        </>
      )}
    </div>
  )
}

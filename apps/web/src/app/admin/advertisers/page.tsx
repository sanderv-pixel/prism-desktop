'use client'

import { useEffect, useState } from 'react'
import { Search, Loader2, ExternalLink } from 'lucide-react'
import { useAdminSecret } from '@/components/admin/AdminSecretProvider'
import { adminHeaders } from '@/lib/admin/fetch'
import { Button } from '@/components/Button'

interface Advertiser {
  id: string
  name: string
  email: string
  website: string | null
  status: string
  balanceCents: number
  lifetimeDepositsCents: number
  totalDepositsCents: number
  campaignCount: number
  activeCampaignCount: number
  totalBudgetCents: number
  totalSpendCents: number
  createdAt: string
}

interface AdvertisersResponse {
  advertisers: Advertiser[]
  total: number
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US').format(n)
}

export default function AdminAdvertisersPage() {
  const { adminSecret } = useAdminSecret()
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const limit = 50

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
        if (search) params.set('search', search)
        const res = await fetch(`/api/admin/advertisers?${params.toString()}`, {
          headers: adminHeaders(adminSecret),
        })
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(json.error ?? 'Failed to load advertisers')
        }
        const data = (await res.json()) as AdvertisersResponse
        setAdvertisers(data.advertisers)
        setTotal(data.total)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [adminSecret, offset, search])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Customers</p>
          <h1 className="text-2xl font-semibold">Advertisers</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setOffset(0)
            }}
            placeholder="Search name or email…"
            className="pl-9 pr-4 py-2 rounded-xl border border-border bg-background text-sm w-full sm:w-72"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-600">{error}</div>
      ) : (
        <>
          <div className="surface overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Advertiser</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Balance</th>
                  <th className="px-4 py-3 font-medium">Campaigns</th>
                  <th className="px-4 py-3 font-medium">Spend</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {advertisers.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{a.name}</div>
                      <div className="text-xs text-muted-foreground">{a.email}</div>
                      {a.website && (
                        <a
                          href={a.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary inline-flex items-center gap-1 mt-1 hover:underline"
                        >
                          {a.website.replace(/^https?:\/\//, '')}
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                          a.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : a.status === 'pending_review'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>{formatCents(a.balanceCents)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatCents(a.totalDepositsCents)} deposited
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {formatNumber(a.activeCampaignCount)} active
                      <span className="text-muted-foreground ml-1">
                        / {formatNumber(a.campaignCount)} total
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>{formatCents(a.totalSpendCents)}</div>
                      <div className="text-xs text-muted-foreground">
                        of {formatCents(a.totalBudgetCents)} budget
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {advertisers.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">No advertisers found.</div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {formatNumber(offset + 1)}–{formatNumber(Math.min(offset + advertisers.length, total))} of {formatNumber(total)}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0}
                onClick={() => setOffset((v) => Math.max(0, v - limit))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={offset + advertisers.length >= total}
                onClick={() => setOffset((v) => v + limit)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

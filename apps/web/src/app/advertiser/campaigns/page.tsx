'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { DashboardShellV2 } from '@/components/dashboard-v2/DashboardShellV2'
import { advertiserNav } from '@/components/dashboard-v2/advertiserNav'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { Button } from '@/components/Button'
import {
  Plus,
  Pause,
  Play,
  Pencil,
  Trash2,
  AlertCircle,
  Target,
  Zap,
} from 'lucide-react'

interface Campaign {
  id: string
  title: string
  status: string
  budgetCents: number
  spentCents: number
  maxBidCpm: number
  maxBidCpc?: number | null
  bidType?: string
  contexts: string[]
  impressions: number
  clicks: number
  ctr: number
  createdAt: string
  updatedAt: string
}

interface AdvertiserData {
  advertiser: { status: string }
  campaigns: Campaign[]
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US').format(n)
}

export default function CampaignsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState<AdvertiserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const userName = user?.email ? user.email.split('@')[0] : 'advertiser'
  const userEmail = user?.email ?? ''

  async function fetchData() {
    try {
      const res = await fetch('/api/advertiser-stats')
      if (!res.ok) throw new Error('Failed to load campaigns')
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id: string, status: string, label: string) {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Update failed')
      await fetchData()
      toast.success(label)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setActionLoading(null)
    }
  }

  async function deleteCampaign(id: string, title: string) {
    if (!confirm(`Delete “${title}”? This cannot be undone.`)) return
    setActionLoading(id)
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Delete failed')
      await fetchData()
      toast.success('Campaign deleted.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setActionLoading(null)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredCampaigns =
    data?.campaigns.filter((c) => (filter === 'all' ? true : c.status === filter)) ??
    []

  if (authLoading || loading) {
    return (
      <DashboardShellV2 view="adv" title="Campaigns" subtitle="Manage and monitor your campaigns." nav={advertiserNav('campaigns')} userName={userName} userEmail={userEmail}>
        <div className="flex items-center justify-center h-96 text-muted-foreground">
          <Zap size={18} className="animate-pulse text-primary mr-2" />
          Loading campaigns…
        </div>
      </DashboardShellV2>
    )
  }

  if (error || !data) {
    return (
      <DashboardShellV2 view="adv" title="Campaigns" subtitle="Manage and monitor your campaigns." nav={advertiserNav('campaigns')} userName={userName} userEmail={userEmail}>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-600 flex items-start gap-3">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      </DashboardShellV2>
    )
  }

  const isActive = data.advertiser.status === 'active'
  const statusCounts = data.campaigns.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <DashboardShellV2 view="adv" title="Campaigns" subtitle="Manage and monitor your campaigns." nav={advertiserNav('campaigns')} userName={userName} userEmail={userEmail}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <p className="eyebrow mb-2">Campaigns</p>
          <h1 className="text-3xl md:text-4xl font-semibold text-foreground">
            Manage campaigns
          </h1>
        </div>
        <Button size="md" href="/advertiser/campaigns/new" disabled={!isActive}>
          <Plus size={16} className="mr-2" />
          New campaign
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: 'all', label: `All (${data.campaigns.length})` },
          { key: 'active', label: `Active (${statusCounts.active ?? 0})` },
          { key: 'paused', label: `Paused (${statusCounts.paused ?? 0})` },
          { key: 'pending_review', label: `Review (${statusCounts.pending_review ?? 0})` },
          { key: 'completed', label: `Completed (${statusCounts.completed ?? 0})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === tab.key
                ? 'bg-violet-50 text-primary border border-violet-200'
                : 'bg-muted text-muted-foreground border border-border hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredCampaigns.length > 0 ? (
        <div className="rounded-2xl card overflow-hidden hover:shadow-md transition">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-medium">Campaign</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Budget</th>
                  <th className="px-6 py-3 font-medium">Spent</th>
                  <th className="px-6 py-3 font-medium">Bid</th>
                  <th className="px-6 py-3 font-medium">Impressions</th>
                  <th className="px-6 py-3 font-medium">CTR</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCampaigns.map((campaign) => {
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
                      <td className="px-6 py-4">
                        <StatusBadge status={campaign.status} />
                      </td>
                      <td className="px-6 py-4 text-foreground/80">
                        {formatCents(campaign.budgetCents)}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-foreground/80">
                            {formatCents(campaign.spentCents)}
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
                        {campaign.bidType === 'cpc'
                          ? `${formatCents(campaign.maxBidCpc ?? 0)} CPC`
                          : `${formatCents(campaign.maxBidCpm)} CPM`}
                      </td>
                      <td className="px-6 py-4 text-foreground/80">
                        {formatNumber(campaign.impressions)}
                      </td>
                      <td className="px-6 py-4 text-foreground/80">{campaign.ctr}%</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {(campaign.status === 'active' || campaign.status === 'pending') && (
                            <button
                              onClick={() => updateStatus(campaign.id, 'paused', 'Campaign paused.')}
                              disabled={actionLoading === campaign.id}
                              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition disabled:opacity-50"
                              title="Pause"
                            >
                              <Pause size={16} />
                            </button>
                          )}
                          {campaign.status === 'paused' && (
                            <button
                              onClick={() => updateStatus(campaign.id, 'pending_review', 'Campaign submitted for review.')}
                              disabled={actionLoading === campaign.id}
                              className="p-2 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 transition disabled:opacity-50"
                              title="Submit for review"
                            >
                              <Play size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => router.push(`/advertiser/campaigns/${campaign.id}`)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => deleteCampaign(campaign.id, campaign.title)}
                            disabled={actionLoading === campaign.id}
                            className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl card p-12 text-center text-muted-foreground hover:shadow-md transition">
          <Target size={40} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium text-foreground/90 mb-1">
            {filter === 'all' ? 'No campaigns yet' : `No ${filter} campaigns`}
          </p>
          <p className="text-sm mb-6">
            {filter === 'all'
              ? 'Create your first campaign to start reaching AI builders.'
              : 'Try a different filter.'}
          </p>
          {filter === 'all' && (
            <Button href="/advertiser/campaigns/new" disabled={!isActive}>
              <Plus size={16} className="mr-2" />
              Create campaign
            </Button>
          )}
        </div>
      )}
    </DashboardShellV2>
  )
}

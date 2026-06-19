'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/Button'

type Campaign = {
  id: string
  title: string
  copy: string
  url: string
  max_bid_cpm: number
  budget_cents: number
  status: string
  created_at: string
  advertisers: {
    id: string
    name: string
    email: string
    website: string | null
    status: string
  } | null
}

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState<Record<string, boolean>>({})

  async function load() {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/campaigns/pending')
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to load campaigns')
      }
      const data = (await res.json()) as Campaign[]
      setCampaigns(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function review(id: string, action: 'approve' | 'reject') {
    setProcessing((prev) => ({ ...prev, [id]: true }))
    try {
      const res = await fetch(`/api/admin/campaigns/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error ?? 'Review failed')
      }
      setCampaigns((prev) => prev.filter((c) => c.id !== id))
      toast.success(json.message ?? (action === 'reject' ? 'Campaign rejected.' : 'Campaign approved.'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Review failed')
    } finally {
      setProcessing((prev) => ({ ...prev, [id]: false }))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <p className="text-muted-foreground">Loading review queue…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-muted/30">
        <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-red-600 max-w-md">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Review queue</p>
        <h1 className="text-2xl font-semibold text-foreground">Campaign review queue</h1>
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-2xl card p-8 text-center hover:shadow-md transition">
          <p className="text-muted-foreground">No campaigns awaiting review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="rounded-2xl card p-6 flex flex-col md:flex-row md:items-start gap-6 hover:shadow-md transition"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-lg font-medium text-foreground truncate">{campaign.title}</h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-500 border border-amber-200">
                    pending review
                  </span>
                </div>
                <p className="text-foreground/80 mb-3">{campaign.copy}</p>
                <a
                  href={campaign.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary hover:text-violet-700 break-all"
                >
                  {campaign.url}
                </a>
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Budget</p>
                    <p className="text-foreground">${(campaign.budget_cents / 100).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Max bid CPM</p>
                    <p className="text-foreground">${(campaign.max_bid_cpm / 100).toFixed(2)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Advertiser</p>
                    <p className="text-foreground truncate">
                      {campaign.advertisers?.name ?? 'Unknown'}
                      <span className="text-muted-foreground ml-2">{campaign.advertisers?.email}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex md:flex-col gap-3 shrink-0">
                <Button
                  size="sm"
                  disabled={processing[campaign.id]}
                  onClick={() => review(campaign.id, 'approve')}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={processing[campaign.id]}
                  onClick={() => review(campaign.id, 'reject')}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

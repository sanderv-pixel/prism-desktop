'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Pause, Play, Trash2 } from 'lucide-react'

interface Creative {
  id: string
  copy: string
  brandName: string | null
  url: string
  iconUrl: string | null
  status: string
  impressions: number
  clicks: number
  ctr: number
}

export function CampaignCreatives({ campaignId }: { campaignId: string }) {
  const [creatives, setCreatives] = useState<Creative[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [copy, setCopy] = useState('')
  const [brandName, setBrandName] = useState('')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/campaigns/${campaignId}/creatives`)
    if (res.ok) setCreatives((await res.json()).creatives ?? [])
    setLoading(false)
  }, [campaignId])

  useEffect(() => {
    load()
  }, [load])

  const best =
    creatives.length > 1
      ? creatives.reduce((a, b) => (b.ctr > a.ctr ? b : a)).id
      : null

  async function addCreative() {
    if (!copy.trim() || !url.trim()) {
      toast.error('Copy and URL are required.')
      return
    }
    setBusy(true)
    const res = await fetch(`/api/campaigns/${campaignId}/creatives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ copy, brandName: brandName || undefined, url }),
    })
    setBusy(false)
    if (res.ok) {
      setCopy('')
      setBrandName('')
      setUrl('')
      setAdding(false)
      toast.success('Variant added')
      load()
    } else {
      toast.error((await res.json().catch(() => ({}))).error ?? 'Could not add variant')
    }
  }

  async function toggle(c: Creative) {
    const res = await fetch(`/api/campaigns/${campaignId}/creatives/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: c.status === 'active' ? 'paused' : 'active' }),
    })
    if (res.ok) load()
    else toast.error('Could not update variant')
  }

  async function remove(c: Creative) {
    const res = await fetch(`/api/campaigns/${campaignId}/creatives/${c.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Variant removed')
      load()
    } else {
      toast.error((await res.json().catch(() => ({}))).error ?? 'Could not remove variant')
    }
  }

  return (
    <div className="rounded-xl border border-border bg-white p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-foreground">Creatives (A/B testing)</h2>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 text-sm text-violet-600 hover:underline"
          >
            <Plus size={15} /> Add variant
          </button>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Active variants split delivery evenly. The winner is the one with the best CTR.
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-3">
          {creatives.map((c, i) => (
            <div
              key={c.id}
              className={`rounded-lg border p-3 flex items-center justify-between gap-4 ${
                c.id === best ? 'border-emerald-300 bg-emerald-50' : 'border-border'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="font-medium truncate">{c.copy}</span>
                  {c.id === best && (
                    <span className="text-[11px] uppercase tracking-wide text-emerald-700 bg-emerald-100 rounded px-1.5 py-0.5">
                      winning
                    </span>
                  )}
                  {c.status === 'paused' && (
                    <span className="text-[11px] uppercase tracking-wide text-amber-700 bg-amber-100 rounded px-1.5 py-0.5">
                      paused
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {c.impressions.toLocaleString()} impressions · {c.clicks.toLocaleString()} clicks ·{' '}
                  {c.ctr}% CTR
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggle(c)}
                  className="p-2 rounded-md hover:bg-muted text-muted-foreground"
                  title={c.status === 'active' ? 'Pause' : 'Resume'}
                >
                  {c.status === 'active' ? <Pause size={15} /> : <Play size={15} />}
                </button>
                {creatives.length > 1 && (
                  <button
                    onClick={() => remove(c)}
                    className="p-2 rounded-md hover:bg-red-50 text-red-500"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {adding && (
            <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-4 space-y-3">
              <input
                value={copy}
                onChange={(e) => setCopy(e.target.value)}
                maxLength={40}
                placeholder="Ad copy (max 40 chars)"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  maxLength={14}
                  placeholder="Brand (optional)"
                  className="rounded-md border px-3 py-2 text-sm"
                />
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://landing.url"
                  className="rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addCreative}
                  disabled={busy}
                  className="rounded-md bg-violet-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {busy ? 'Adding…' : 'Add variant'}
                </button>
                <button onClick={() => setAdding(false)} className="rounded-md border px-4 py-2 text-sm">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

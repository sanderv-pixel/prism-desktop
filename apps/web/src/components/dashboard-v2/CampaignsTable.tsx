'use client'

import Link from 'next/link'
import { formatCents, formatNumber } from './format'
import { targetingSummary } from '@/lib/countries'

export interface CampaignRow {
  id: string
  title: string
  status: string
  objective: string
  bidType: string
  impressions: number
  clicks: number
  ctr: number
  cpm: number
  cpc: number
  spentCents: number
  targetCountries?: string[]
}

interface CampaignsTableProps {
  campaigns: CampaignRow[]
  onUpdate: (id: string, status: string) => void
  actionLoading: string | null
  editBase?: string
}

function statusChip(status: string): { cls: string; label: string } {
  switch (status) {
    case 'active':
      return { cls: 'live', label: 'Live' }
    case 'paused':
      return { cls: 'pause', label: 'Paused' }
    case 'pending':
    case 'pending_review':
      return { cls: 'rev', label: 'In review' }
    case 'completed':
      return { cls: 'pause', label: 'Completed' }
    default:
      return { cls: 'pause', label: status.replace(/_/g, ' ') }
  }
}

/** Campaigns table with real metrics + status chips. Pause / submit reuse the
 * existing /api/campaigns PATCH via onUpdate. */
export function CampaignsTable({
  campaigns,
  onUpdate,
  actionLoading,
  editBase = '/advertiser/campaigns',
}: CampaignsTableProps) {
  if (!campaigns.length) {
    return <div className="dv-empty">No campaigns yet.</div>
  }
  return (
    <div className="dv-tablewrap">
      <table className="dv-table">
        <thead>
          <tr>
            <th>Campaign</th>
            <th>Status</th>
            <th className="r">Impr.</th>
            <th className="r">CTR</th>
            <th className="r">CPC</th>
            <th className="r">Spent</th>
            <th className="r">Actions</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => {
            const chip = statusChip(c.status)
            const noDelivery = c.impressions === 0
            const busy = actionLoading === c.id
            return (
              <tr key={c.id}>
                <td>
                  <div className="dv-cmp">
                    <span className="ci">{(c.title || '?').charAt(0)}</span>
                    <div>
                      <div className="cn">{c.title}</div>
                      <div className="cs">
                        {c.bidType ? `${c.bidType.toUpperCase()} · ` : ''}
                        {c.objective} · {targetingSummary(c.targetCountries)}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`dv-stat ${chip.cls}`}>{chip.label}</span>
                </td>
                <td className="r">{noDelivery ? '-' : formatNumber(c.impressions)}</td>
                <td className="r">{noDelivery ? '-' : `${c.ctr}%`}</td>
                <td className="r">{noDelivery ? '-' : formatCents(c.cpc)}</td>
                <td className="r">{formatCents(c.spentCents)}</td>
                <td className="r">
                  <div style={{ display: 'inline-flex', gap: 4, justifyContent: 'flex-end' }}>
                    {(c.status === 'active' || c.status === 'pending') && (
                      <button
                        className="dv-rowact"
                        onClick={() => onUpdate(c.id, 'paused')}
                        disabled={busy}
                        title="Pause"
                      >
                        Pause
                      </button>
                    )}
                    {c.status === 'paused' && (
                      <button
                        className="dv-rowact"
                        onClick={() => onUpdate(c.id, 'pending_review')}
                        disabled={busy}
                        title="Submit for review"
                      >
                        Submit
                      </button>
                    )}
                    <Link className="dv-rowact" href={`${editBase}/${c.id}`} title="Edit">
                      Edit
                    </Link>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

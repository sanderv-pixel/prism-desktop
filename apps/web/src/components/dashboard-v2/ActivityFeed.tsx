'use client'

import { formatPayout, timeAgo, describeContext } from './format'

export interface FeedItem {
  id: string
  advertiserName: string
  campaignTitle: string
  context: unknown
  payoutCents: number
  createdAt: string
}

/** Live activity rows fed by real recent impressions (the ad-pill styling). */
export function ActivityFeed({ items }: { items: FeedItem[] }) {
  if (!items.length) {
    return <div className="dv-empty">No ad views yet. They appear here as your agents work.</div>
  }
  return (
    <div className="dv-feed">
      {items.slice(0, 8).map((item) => {
        const name = item.advertiserName || item.campaignTitle || 'Ad'
        return (
          <div className="frow" key={item.id}>
            <span className="dv-pill">
              <span className="pic">{name.charAt(0).toUpperCase()}</span>
              <span className="pnm">{name}</span>
            </span>
            <span className="ctx">{describeContext(item.context, item.campaignTitle)}</span>
            <span className="amt">+{formatPayout(item.payoutCents)}</span>
            <span className="tm">{timeAgo(item.createdAt)}</span>
          </div>
        )
      })}
    </div>
  )
}

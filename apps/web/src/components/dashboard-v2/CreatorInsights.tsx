'use client'

import type { CSSProperties } from 'react'
import type { DashboardData } from './types'
import { formatCents } from './format'

const MIN_PAYOUT_CENTS = 2000
const SUB_CENTS = 2000 // a typical $20/mo AI subscription

const tileLabel: CSSProperties = { fontSize: 12, color: 'var(--mut)' }
const tileBig: CSSProperties = { fontSize: 23, fontWeight: 700, color: '#fff', margin: '6px 0', fontFamily: 'var(--font-display), sans-serif' }
const tileHint: CSSProperties = { fontSize: 11.5, color: 'var(--mut)' }

function fmtDuration(ms: number): string {
  const min = Math.round(ms / 60000)
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function fmtHour(h: number): string {
  const am = h < 12
  const hr = h % 12 === 0 ? 12 : h % 12
  return `${hr}${am ? 'am' : 'pm'}`
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,.07)', overflow: 'hidden', margin: '4px 0' }}>
      <div style={{ height: '100%', width: `${Math.max(2, pct)}%`, background: color, borderRadius: 999 }} />
    </div>
  )
}

function StatTile({ label, value, hint, color }: { label: string; value: string; hint: string; color: string }) {
  return (
    <div className="dv-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flex: 'none' }} />
        <span style={tileLabel}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginTop: 8, fontFamily: 'var(--font-display), sans-serif' }}>{value}</div>
      <div style={{ ...tileHint, marginTop: 2 }}>{hint}</div>
    </div>
  )
}

export function CreatorInsights({ data }: { data: DashboardData }) {
  const { stats, chartData, recentImpressions, insights } = data

  const last30 = stats.last30EarningsCents
  const coveragePct = Math.min(100, SUB_CENTS > 0 ? (last30 / SUB_CENTS) * 100 : 0)
  const yearly = Math.round(last30 * 12.17)
  const payoutPct = Math.min(100, (stats.balanceCents / MIN_PAYOUT_CENTS) * 100)
  const toNext = Math.max(0, MIN_PAYOUT_CENTS - stats.balanceCents)

  let streak = 0
  for (let i = chartData.length - 1; i >= 0; i--) {
    if (chartData[i].earnings > 0) streak++
    else break
  }

  const cpmOf = (days: typeof chartData) => {
    const imp = days.reduce((a, d) => a + d.impressions, 0)
    const earnCents = days.reduce((a, d) => a + d.earnings, 0) * 100
    return imp > 0 ? (earnCents / imp) * 1000 : 0
  }
  const cpmNow = cpmOf(chartData.slice(-7))
  const cpmPrev = cpmOf(chartData.slice(-14, -7))
  const cpmTrend = cpmPrev > 0 ? Math.round(((cpmNow - cpmPrev) / cpmPrev) * 100) : 0

  // earnings by hour, rotated from UTC buckets to the viewer's local time
  const utc = new Array(24).fill(0) as number[]
  insights.hourly.forEach(({ h, mc }) => { if (h >= 0 && h < 24) utc[h] = mc })
  const offset = Math.round(-new Date().getTimezoneOffset() / 60)
  const local = utc.map((_, lh) => utc[(((lh - offset) % 24) + 24) % 24])
  const maxHour = Math.max(...local, 1)
  const peakHour = local.indexOf(Math.max(...local))
  const hasHourly = local.some((v) => v > 0)

  const unpaid = recentImpressions.filter((i) => !i.paid)
  const reasons: Record<string, number> = {}
  unpaid.forEach((i) => {
    const r = i.notPaidReason || 'Not billable'
    reasons[r] = (reasons[r] || 0) + 1
  })
  const topReasons = Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 4)
  const unpaidPct = recentImpressions.length > 0 ? Math.round((unpaid.length / recentImpressions.length) * 100) : 0

  return (
    <>
      {/* Subscription coverage / run rate / next payout */}
      <div className="dv-card" style={{ marginTop: 16 }}>
        <h3>This month <span className="meta">where you stand</span></h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 22, marginTop: 14 }}>
          <div>
            <div style={tileLabel}>AI subscription covered</div>
            <div style={tileBig}>{Math.round(coveragePct)}%</div>
            <Bar pct={coveragePct} color="var(--emerald)" />
            <div style={tileHint}>{formatCents(last30)} of a $20 plan</div>
          </div>
          <div>
            <div style={tileLabel}>Run rate</div>
            <div style={tileBig}>{formatCents(last30)}<span style={{ fontSize: 13, color: 'var(--mut)', fontWeight: 400 }}>/mo</span></div>
            <div style={{ ...tileHint, marginTop: 10 }}>about {formatCents(yearly)} / year at this pace</div>
          </div>
          <div>
            <div style={tileLabel}>Next payout</div>
            <div style={tileBig}>{toNext > 0 ? formatCents(toNext) : 'Ready'}</div>
            <Bar pct={payoutPct} color="var(--v500)" />
            <div style={tileHint}>{toNext > 0 ? 'to go (min $20)' : `${formatCents(stats.balanceCents)} available`}</div>
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: 12, marginTop: 16 }}>
        <StatTile label="Monetized wait time" value={fmtDuration(insights.totalDurationMs)} hint="of AI thinking, paid" color="var(--cyan)" />
        <StatTile label="Lifetime ad views" value={insights.totalViews.toLocaleString()} hint="validated and paid" color="var(--v400)" />
        <StatTile label="Earning streak" value={`${streak} day${streak === 1 ? '' : 's'}`} hint="in a row" color="var(--amber)" />
        <StatTile
          label="Ad rate (7d)"
          value={cpmNow > 0 ? formatCents(Math.round(cpmNow)) : formatCents(0)}
          hint={cpmPrev > 0 ? `${cpmTrend >= 0 ? '▲' : '▼'} ${Math.abs(cpmTrend)}% vs prior week` : 'effective CPM'}
          color="var(--emerald)"
        />
      </div>

      <div className="dv-row2">
        <div className="dv-card">
          <h3>Best earning times <span className="meta">{hasHourly ? `peak ${fmtHour(peakHour)}, your time` : 'your local time'}</span></h3>
          {!hasHourly ? (
            <div className="dv-empty">Not enough data yet.</div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 96, marginTop: 14 }}>
                {local.map((v, h) => (
                  <div
                    key={h}
                    title={`${fmtHour(h)}: ${formatCents(Math.round(v / 1000))}`}
                    style={{
                      flex: 1,
                      height: `${Math.max(3, (v / maxHour) * 100)}%`,
                      borderRadius: 3,
                      background: h === peakHour ? 'var(--v500)' : 'rgba(139,92,246,.32)',
                    }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--mut)', marginTop: 7 }}>
                <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
              </div>
            </>
          )}
        </div>

        <div className="dv-card">
          <h3>Unpaid views <span className="meta">recent</span></h3>
          {unpaid.length === 0 ? (
            <div className="dv-empty">{recentImpressions.length === 0 ? 'No ad views yet.' : 'Every recent view paid. Nice.'}</div>
          ) : (
            <>
              <div style={{ fontSize: 13, color: 'var(--txt)', margin: '12px 0 14px' }}>
                <b style={{ color: '#fff' }}>{unpaidPct}%</b> of recent views did not pay. Here is why:
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {topReasons.map(([reason, count]) => (
                  <div key={reason}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: '#e2e8f0' }}>{reason}</span>
                      <span style={{ color: 'var(--mut)', fontSize: 12 }}>{Math.round((count / unpaid.length) * 100)}%</span>
                    </div>
                    <Bar pct={(count / unpaid.length) * 100} color="var(--amber)" />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

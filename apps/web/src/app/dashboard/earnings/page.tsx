'use client'

import { useState, type CSSProperties } from 'react'
import '../../dashboard-v2/dashboard-v2.css'
import { Zap, AlertCircle } from 'lucide-react'

const dateInput: CSSProperties = {
  background: 'rgba(255,255,255,.04)', border: '1px solid var(--line)', borderRadius: 9,
  padding: '6px 10px', color: '#e2e8f0', fontSize: 12.5, colorScheme: 'dark',
}
import { useAuth } from '@/hooks/useAuth'
import { useDashboardData } from '@/components/dashboard-v2/useDashboardData'
import { earnerNav } from '@/components/dashboard-v2/earnerNav'
import { DashboardShellV2 } from '@/components/dashboard-v2/DashboardShellV2'
import { KpiCard } from '@/components/dashboard-v2/KpiCard'
import { AreaChartV2 } from '@/components/dashboard-v2/AreaChartV2'
import { DonutChart } from '@/components/dashboard-v2/DonutChart'
import { CreatorInsights } from '@/components/dashboard-v2/CreatorInsights'
import { formatCents, formatPayout, formatNumber, timeAgo, describeContext } from '@/components/dashboard-v2/format'

export default function EarningsPage() {
  const { user, loading: authLoading } = useAuth()
  const { data, loading, error } = useDashboardData()
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [shown, setShown] = useState(6)

  const userName = user?.email ? user.email.split('@')[0] : 'creator'
  const userEmail = user?.email ?? ''

  function shell(children: React.ReactNode) {
    return (
      <DashboardShellV2 view="earn" title="Earnings" subtitle="Every validated view, and what it paid." nav={earnerNav('earnings')} userName={userName} userEmail={userEmail}>
        {children}
      </DashboardShellV2>
    )
  }

  if (authLoading || loading) return shell(<div className="dv-loadwrap"><Zap size={18} className="animate-pulse" /> Loading earnings…</div>)
  if (error || !data) return shell(<div className="dv-alert"><AlertCircle size={20} /><div><p style={{ fontWeight: 600 }}>Failed to load earnings</p><p style={{ fontSize: 13, opacity: 0.85 }}>{error}</p></div></div>)

  const { stats, chartData, toolBreakdown, recentImpressions } = data
  const passRate = stats.totalImpressions > 0 ? (stats.validatedImpressions / stats.totalImpressions) * 100 : 0

  const filteredImpressions = recentImpressions.filter((imp) => {
    if (statusFilter === 'paid' && !imp.paid) return false
    if (statusFilter === 'unpaid' && imp.paid) return false
    const day = imp.createdAt.slice(0, 10)
    if (fromDate && day < fromDate) return false
    if (toDate && day > toDate) return false
    return true
  })
  const visibleImpressions = filteredImpressions.slice(0, shown)
  const filtersActive = statusFilter !== 'all' || Boolean(fromDate) || Boolean(toDate)
  const monthSpark = chartData.map((d) => d.earnings).slice(-8)
  const change = stats.earningsChange
  const toolRows = toolBreakdown.slice(0, 6).map((t) => ({ name: t.tool, value: t.earnings, display: formatPayout(t.earnings * 100) }))

  return shell(
    <>
      <div className="dv-grid dv-kpis">
        <KpiCard label="Total earned" dotColor="var(--cyan)" value={stats.totalEarningsCents} format={(n) => formatCents(n)} delta="since you installed" />
        <KpiCard label="This month" dotColor="var(--v400)" value={stats.last30EarningsCents} format={(n) => formatCents(n)} spark={monthSpark} delta={<><b className={change < 0 ? 'down' : ''}>{change < 0 ? '▼' : '▲'} {Math.abs(change)}%</b> vs last month</>} />
        <KpiCard label="From your usage" dotColor="var(--emerald)" value={stats.ownEarningsCents} format={(n) => formatCents(n)} emphasis delta="own ad views" />
        <KpiCard label="Validated views" dotColor="var(--amber)" value={stats.validatedImpressions} format={(n) => formatNumber(n)} delta={`${passRate.toFixed(1)}% pass rate`} />
      </div>

      <CreatorInsights data={data} />

      <div className="dv-card" style={{ marginTop: 16 }}>
        <h3>Earnings <span className="meta">last {chartData.length || 14} days</span></h3>
        <div className="dv-chartwrap"><AreaChartV2 data={chartData.map((d) => d.earnings)} labels={chartData.map((d) => d.date)} tooltipRows={(i) => [{ label: 'Earned', value: `$${chartData[i].earnings.toFixed(2)}`, color: '#8b5cf6' }, { label: 'Ad views', value: formatNumber(chartData[i].impressions), color: '#22d3ee' }]} color1="#8b5cf6" color2="#22d3ee" emptyLabel="No earnings yet" /></div>
        <div className="dv-legend"><span><i style={{ background: '#8b5cf6' }} /> daily earnings</span><span><i style={{ background: '#22d3ee' }} /> 7-day avg</span></div>
      </div>

      <div className="dv-row2">
        <div className="dv-card">
          <h3>Recent ad views <span className="meta">{filtersActive ? `${filteredImpressions.length} match` : `${recentImpressions.length} recent`}</span></h3>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', margin: '12px 0 6px' }}>
            <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,.04)', border: '1px solid var(--line)', borderRadius: 10, padding: 3 }}>
              {([['all', 'All'], ['paid', 'Paid'], ['unpaid', 'Not paid']] as const).map(([f, label]) => (
                <button
                  key={f}
                  onClick={() => { setStatusFilter(f); setShown(6) }}
                  style={{
                    padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                    background: statusFilter === f ? 'var(--v600)' : 'transparent',
                    color: statusFilter === f ? '#fff' : 'var(--txt)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <input type="date" aria-label="From date" value={fromDate} max={toDate || undefined} onChange={(e) => { setFromDate(e.target.value); setShown(6) }} style={dateInput} />
            <span style={{ color: 'var(--mut)', fontSize: 12 }}>to</span>
            <input type="date" aria-label="To date" value={toDate} min={fromDate || undefined} onChange={(e) => { setToDate(e.target.value); setShown(6) }} style={dateInput} />
            {filtersActive && (
              <button onClick={() => { setStatusFilter('all'); setFromDate(''); setToDate(''); setShown(6) }} style={{ fontSize: 12, color: 'var(--mut)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Clear
              </button>
            )}
          </div>

          {filteredImpressions.length === 0 ? (
            <div className="dv-empty">{recentImpressions.length === 0 ? 'No ad views yet.' : 'No ad views match these filters.'}</div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {visibleImpressions.map((imp, i) => {
                  const name = imp.advertiserName || imp.campaignTitle || 'Ad'
                  return (
                    <div
                      key={imp.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: i === 0 ? 'none' : '1px solid var(--line)' }}
                    >
                      <span
                        style={{
                          flex: 'none', width: 34, height: 34, borderRadius: 10,
                          background: imp.paid ? 'rgba(52,211,153,.13)' : 'rgba(255,255,255,.05)',
                          color: imp.paid ? 'var(--emerald)' : 'var(--mut)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14,
                        }}
                      >
                        {name.charAt(0).toUpperCase()}
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13.5, color: '#fff', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {name}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--mut)', marginTop: 1 }}>
                          {describeContext(imp.context, imp.campaignTitle)} · {timeAgo(imp.createdAt)}
                        </div>
                      </div>
                      <div style={{ flex: 'none', maxWidth: 170, textAlign: 'right' }}>
                        {imp.paid ? (
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--emerald)' }}>+{formatPayout(imp.payoutCents)}</div>
                        ) : (
                          <span
                            style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, color: '#fcd34d', background: 'rgba(251,191,36,.12)', padding: '4px 10px', borderRadius: 9, lineHeight: 1.35 }}
                            title="Why this view did not pay"
                          >
                            {imp.notPaidReason || 'Not billable'}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              {filteredImpressions.length > shown && (
                <button
                  onClick={() => setShown((s) => s + 10)}
                  style={{ width: '100%', marginTop: 12, padding: '9px 0', borderRadius: 10, border: '1px solid var(--line)', background: 'rgba(255,255,255,.03)', color: 'var(--txt)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  View more ({filteredImpressions.length - shown})
                </button>
              )}
            </>
          )}
        </div>
        <div className="dv-card">
          <h3>By tool <span className="meta">earnings share</span></h3>
          <DonutChart data={toolRows} emptyLabel="No tool activity yet" centerLabel="this month" />
        </div>
      </div>

      <div className="dv-ftnote">Real earnings from your account</div>
    </>
  )
}

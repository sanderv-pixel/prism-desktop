'use client'

import '../../dashboard-v2/dashboard-v2.css'
import { Zap, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardData } from '@/components/dashboard-v2/useDashboardData'
import { earnerNav } from '@/components/dashboard-v2/earnerNav'
import { DashboardShellV2 } from '@/components/dashboard-v2/DashboardShellV2'
import { KpiCard } from '@/components/dashboard-v2/KpiCard'
import { AreaChartV2 } from '@/components/dashboard-v2/AreaChartV2'
import { BarBreakdown } from '@/components/dashboard-v2/BarBreakdown'
import { formatCents, formatNumber, timeAgo, describeContext } from '@/components/dashboard-v2/format'

export default function EarningsPage() {
  const { user, loading: authLoading } = useAuth()
  const { data, loading, error } = useDashboardData()

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
  const monthSpark = chartData.map((d) => d.earnings).slice(-8)
  const change = stats.earningsChange
  const toolRows = toolBreakdown.slice(0, 6).map((t) => ({ name: t.tool, value: t.earnings, display: `$${t.earnings.toFixed(2)}` }))

  return shell(
    <>
      <div className="dv-grid dv-kpis">
        <KpiCard label="Total earned" dotColor="var(--cyan)" value={stats.totalEarningsCents} format={(n) => formatCents(n)} delta="since you installed" />
        <KpiCard label="This month" dotColor="var(--v400)" value={stats.last30EarningsCents} format={(n) => formatCents(n)} spark={monthSpark} delta={<><b className={change < 0 ? 'down' : ''}>{change < 0 ? '▼' : '▲'} {Math.abs(change)}%</b> vs last month</>} />
        <KpiCard label="From your usage" dotColor="var(--emerald)" value={stats.ownEarningsCents} format={(n) => formatCents(n)} emphasis delta="own ad views" />
        <KpiCard label="Validated views" dotColor="var(--amber)" value={stats.validatedImpressions} format={(n) => formatNumber(n)} delta={`${passRate.toFixed(1)}% pass rate`} />
      </div>

      <div className="dv-card" style={{ marginTop: 16 }}>
        <h3>Earnings <span className="meta">last {chartData.length || 14} days</span></h3>
        <div className="dv-chartwrap"><AreaChartV2 data={chartData.map((d) => d.earnings)} labels={chartData.map((d) => d.date)} tooltipRows={(i) => [{ label: 'Earned', value: `$${chartData[i].earnings.toFixed(2)}`, color: '#8b5cf6' }, { label: 'Ad views', value: formatNumber(chartData[i].impressions), color: '#22d3ee' }]} color1="#8b5cf6" color2="#22d3ee" emptyLabel="No earnings yet" /></div>
        <div className="dv-legend"><span><i style={{ background: '#8b5cf6' }} /> daily earnings</span><span><i style={{ background: '#22d3ee' }} /> 7-day avg</span></div>
      </div>

      <div className="dv-row2">
        <div className="dv-card">
          <h3>Recent ad views <span className="meta">latest {Math.min(recentImpressions.length, 20)}</span></h3>
          {recentImpressions.length === 0 ? (
            <div className="dv-empty">No ad views yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recentImpressions.slice(0, 20).map((imp, i) => {
                const name = imp.advertiserName || imp.campaignTitle || 'Ad'
                return (
                  <div
                    key={imp.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '11px 0',
                      borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                    }}
                  >
                    <span
                      style={{
                        flex: 'none', width: 34, height: 34, borderRadius: 10,
                        background: imp.paid ? 'rgba(52,211,153,.13)' : 'rgba(255,255,255,.05)',
                        color: imp.paid ? 'var(--emerald)' : 'var(--mut)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 600, fontSize: 14,
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
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--emerald)' }}>
                          +{formatCents(imp.payoutCents)}
                        </div>
                      ) : (
                        <span
                          style={{
                            display: 'inline-block', fontSize: 11, fontWeight: 600,
                            color: '#fcd34d', background: 'rgba(251,191,36,.12)',
                            padding: '4px 10px', borderRadius: 9, lineHeight: 1.35,
                          }}
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
          )}
        </div>
        <div className="dv-card">
          <h3>By tool <span className="meta">this month</span></h3>
          <BarBreakdown rows={toolRows} emptyLabel="No tool activity yet" />
        </div>
      </div>

      <div className="dv-ftnote">Real earnings from your account</div>
    </>
  )
}

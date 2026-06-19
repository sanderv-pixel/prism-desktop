import { NextResponse } from 'next/server'

export const dynamic = 'force-static'

function last30Days() {
  const data: { date: string; spend: number; impressions: number; clicks: number }[] = []
  const base = 18
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const date = d.toISOString().split('T')[0]
    const isWeekend = d.getDay() === 0 || d.getDay() === 6
    const trend = (30 - i) * 0.45
    const weekendDip = isWeekend ? 0.6 : 1
    const noise = Math.sin(i * 0.8) * 3 + Math.cos(i * 1.5) * 2
    const spend = Number(((base + trend + noise) * weekendDip).toFixed(2))
    const impressions = Math.round((spend * 100) / 0.0199)
    const clicks = Math.round(impressions * 0.0238)
    data.push({ date, spend, impressions, clicks })
  }
  return data
}

const campaigns = [
  {
    id: 'demo-camp-001',
    title: 'Railway Launch Week',
    status: 'active',
    objective: 'awareness',
    bidType: 'cpm',
    budgetCents: 250_00,
    spentCents: 42_00,
    maxBidCpm: 1200,
    contexts: ['chatgpt', 'claude', 'cursor', 'vscode', 'developers'],
    impressions: 12_400,
    clicks: 312,
    conversions: 4,
    ctr: 2.52,
    cpm: 1987,
    cpc: 83,
    createdAt: '2026-05-10T10:00:00.000Z',
    updatedAt: '2026-06-14T10:00:00.000Z',
  },
  {
    id: 'demo-camp-002',
    title: 'Supabase Launch Week',
    status: 'active',
    objective: 'awareness',
    bidType: 'cpm',
    budgetCents: 500_00,
    spentCents: 89_00,
    maxBidCpm: 1500,
    contexts: ['chatgpt', 'cursor', 'nextjs', 'react', 'supabase', 'postgresql'],
    impressions: 21_800,
    clicks: 538,
    conversions: 9,
    ctr: 2.47,
    cpm: 1995,
    cpc: 83,
    createdAt: '2026-05-12T10:00:00.000Z',
    updatedAt: '2026-06-14T10:00:00.000Z',
  },
  {
    id: 'demo-camp-003',
    title: 'Lovable Launch Week',
    status: 'active',
    objective: 'awareness',
    bidType: 'cpm',
    budgetCents: 300_00,
    spentCents: 21_00,
    maxBidCpm: 1300,
    contexts: ['chatgpt', 'claude', 'lovable', 'vibecoders', 'bolt'],
    impressions: 8_200,
    clicks: 178,
    conversions: 2,
    ctr: 2.17,
    cpm: 1951,
    cpc: 84,
    createdAt: '2026-05-20T10:00:00.000Z',
    updatedAt: '2026-06-14T10:00:00.000Z',
  },
  {
    id: 'demo-camp-004',
    title: 'Tech Jobs Board',
    status: 'paused',
    objective: 'performance',
    bidType: 'cpc',
    budgetCents: 400_00,
    spentCents: 15_00,
    maxBidCpm: 1600,
    contexts: ['job-seeking', 'developers', 'business', 'cursor'],
    impressions: 6_100,
    clicks: 186,
    conversions: 6,
    ctr: 3.05,
    cpm: 1967,
    cpc: 81,
    createdAt: '2026-05-22T10:00:00.000Z',
    updatedAt: '2026-06-10T10:00:00.000Z',
  },
  {
    id: 'demo-camp-005',
    title: 'Senior Full-Stack Engineer',
    status: 'pending_review',
    objective: 'performance',
    bidType: 'cpa',
    budgetCents: 200_00,
    spentCents: 8_00,
    maxBidCpm: 1400,
    contexts: ['hiring', 'recruiters', 'founders', 'business'],
    impressions: 3_200,
    clicks: 74,
    conversions: 1,
    ctr: 2.31,
    cpm: 2000,
    cpc: 86,
    createdAt: '2026-06-13T10:00:00.000Z',
    updatedAt: '2026-06-14T10:00:00.000Z',
  },
]

export async function GET() {
  const chartData = last30Days()
  const totalSpendCents = chartData.reduce((sum, d) => sum + Math.round(d.spend * 100), 0)
  const totalBudgetCents = campaigns.reduce((sum, c) => sum + c.budgetCents, 0)
  const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0)
  const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0)
  const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0)
  const activeCampaigns = campaigns.filter((c) => c.status === 'active').length

  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const cpm = totalImpressions > 0 ? Math.round((totalSpendCents / totalImpressions) * 1000) : 0
  const cpc = totalClicks > 0 ? Math.round(totalSpendCents / totalClicks) : 0
  const cpa = totalConversions > 0 ? Math.round(totalSpendCents / totalConversions) : 0
  const cvr = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0

  const reach = Math.round(totalImpressions / 3.43)
  const frequency = reach > 0 ? totalImpressions / reach : 0

  return NextResponse.json({
    advertiser: {
      id: 'demo-advertiser',
      name: 'Acme SaaS',
      status: 'active',
      subscriptionStatus: 'active',
    },
    stats: {
      totalSpendCents,
      totalBudgetCents,
      remainingBudgetCents: totalBudgetCents - totalSpendCents,
      totalImpressions,
      totalClicks,
      totalConversions,
      ctr: Number(ctr.toFixed(2)),
      cpm,
      cpc,
      cpa,
      cvr: Number(cvr.toFixed(2)),
      reach,
      frequency: Number(frequency.toFixed(2)),
      activeCampaigns,
      totalCampaigns: campaigns.length,
      spendChange: 18,
    },
    chartData,
    campaigns,
  })
}

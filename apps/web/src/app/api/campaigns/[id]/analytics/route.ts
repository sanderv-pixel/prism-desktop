import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'

function parseRange(searchParams: URLSearchParams): number | 'all' {
  const raw = searchParams.get('range')
  if (raw === 'all') return 'all'
  const n = parseInt(raw ?? '', 10)
  if ([7, 30, 90].includes(n)) return n
  return 30
}

function impressionSpendCents(auctionPriceCpm: number | null) {
  return Math.max(1, Math.round((auctionPriceCpm ?? 0) / 1000))
}

function parseContextKey(contextString: string | null | undefined): string {
  if (!contextString) return 'Unknown'
  try {
    const parsed = JSON.parse(contextString)
    return parsed.editor || parsed.aiTool || parsed.projectType || 'Other'
  } catch {
    return contextString.length > 24 ? contextString.slice(0, 24) + '…' : contextString
  }
}

function getStartOfDay(daysAgo: number, now: Date) {
  const d = new Date(now)
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - daysAgo)
  return d
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authClient = await createClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  try {
    const { data: advertiser } = await supabase
      .from('advertisers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!advertiser) {
      return NextResponse.json({ error: 'Advertiser not found' }, { status: 404 })
    }

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', params.id)
      .eq('advertiser_id', advertiser.id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const range = parseRange(req.nextUrl.searchParams)
    const days = range === 'all' ? 365 : range
    const startIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    const now = new Date()

    const [impressionsResult, clicksResult, conversionsResult, dailySpendResult] =
      await Promise.all([
        supabase
          .from('impressions')
          .select('auction_price_cpm, context, session_id, source, created_at')
          .eq('campaign_id', params.id)
          .gte('created_at', startIso)
          .order('created_at', { ascending: false }),
        supabase
          .from('clicks')
          .select('created_at')
          .eq('campaign_id', params.id)
          .gte('created_at', startIso)
          .order('created_at', { ascending: false }),
        supabase
          .from('conversions')
          .select('value_cents, created_at')
          .eq('campaign_id', params.id)
          .gte('created_at', startIso)
          .order('created_at', { ascending: false }),
        supabase
          .from('campaign_daily_spend')
          .select('spend_date, spent_cents')
          .eq('campaign_id', params.id)
          .gte('spend_date', startIso.slice(0, 10))
          .order('spend_date', { ascending: true }),
      ])

    const impressions = (impressionsResult.data ?? []) as any[]
    const clicks = (clicksResult.data ?? []) as any[]
    const conversions = (conversionsResult.data ?? []) as any[]
    const dailySpendRows = (dailySpendResult.data ?? []) as any[]

    const totalImpressions = impressions.length
    const totalClicks = clicks.length
    const totalConversions = conversions.length
    const totalSpendCents =
      dailySpendRows.reduce((sum, r) => sum + (r.spent_cents ?? 0), 0) ||
      impressions.reduce((sum, i) => sum + impressionSpendCents(i.auction_price_cpm), 0)

    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
    const cpc = totalClicks > 0 ? Math.round(totalSpendCents / totalClicks) : 0
    const cpm = totalImpressions > 0 ? Math.round((totalSpendCents / totalImpressions) * 1000) : 0
    const cpa = totalConversions > 0 ? Math.round(totalSpendCents / totalConversions) : 0
    const cvr = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0

    const recentSessions = new Set(impressions.map((i) => i.session_id).filter(Boolean))
    const reach = recentSessions.size
    const frequency = reach > 0 ? totalImpressions / reach : 0

    // Time-series buckets
    const dailySpend: Record<string, number> = {}
    const dailyImpressions: Record<string, number> = {}
    const dailyClicks: Record<string, number> = {}
    for (let i = days - 1; i >= 0; i--) {
      const d = getStartOfDay(i, now)
      const key = d.toISOString().split('T')[0]
      dailySpend[key] = 0
      dailyImpressions[key] = 0
      dailyClicks[key] = 0
    }

    for (const row of dailySpendRows) {
      const key = row.spend_date
      if (dailySpend[key] !== undefined) {
        dailySpend[key] = (row.spent_cents ?? 0) / 100
      }
    }
    for (const imp of impressions) {
      const key = imp.created_at.split('T')[0]
      if (dailyImpressions[key] !== undefined) {
        dailyImpressions[key] += 1
        if (dailySpendRows.length === 0) {
          dailySpend[key] += impressionSpendCents(imp.auction_price_cpm) / 100
        }
      }
    }
    for (const click of clicks) {
      const key = click.created_at.split('T')[0]
      if (dailyClicks[key] !== undefined) {
        dailyClicks[key] += 1
      }
    }

    const chartData = Object.entries(dailySpend).map(([date, spend]) => ({
      date,
      spend: Number(spend.toFixed(2)),
      impressions: dailyImpressions[date],
      clicks: dailyClicks[date],
    }))

    // Context breakdown
    const contextMap = new Map<string, { impressions: number; spend: number }>()
    for (const imp of impressions) {
      const key = parseContextKey(imp.context)
      const current = contextMap.get(key) ?? { impressions: 0, spend: 0 }
      current.impressions += 1
      current.spend += impressionSpendCents(imp.auction_price_cpm) / 100
      contextMap.set(key, current)
    }
    const contextBreakdown = Array.from(contextMap.entries())
      .map(([name, vals]) => ({ name, ...vals }))
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 10)

    // Source breakdown — which surface (Codex, Cursor, Claude, terminal) served each view.
    const SOURCE_LABELS: Record<string, string> = {
      claude: 'Claude',
      cursor: 'Cursor',
      codex: 'Codex',
      terminal: 'Terminal',
      unknown: 'Unknown',
    }
    const sourceMap = new Map<string, { impressions: number; spend: number }>()
    for (const imp of impressions) {
      const key = SOURCE_LABELS[imp.source as string] ?? 'Unknown'
      const current = sourceMap.get(key) ?? { impressions: 0, spend: 0 }
      current.impressions += 1
      current.spend += impressionSpendCents(imp.auction_price_cpm) / 100
      sourceMap.set(key, current)
    }
    const sourceBreakdown = Array.from(sourceMap.entries())
      .map(([name, vals]) => ({ name, ...vals }))
      .sort((a, b) => b.impressions - a.impressions)

    // Recent activity
    const recentActivity = [
      ...impressions.slice(0, 15).map((i) => ({
        type: 'impression' as const,
        date: i.created_at,
        detail: parseContextKey(i.context),
      })),
      ...clicks.slice(0, 10).map((c) => ({
        type: 'click' as const,
        date: c.created_at,
        detail: 'Ad clicked',
      })),
      ...conversions.slice(0, 10).map((c) => ({
        type: 'conversion' as const,
        date: c.created_at,
        detail: `Conversion · ${(c.value_cents / 100).toFixed(2)}`,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20)

    // Budget pacing
    const budgetCents = campaign.budget_cents ?? 0
    const percentUsed = budgetCents > 0 ? Math.min((totalSpendCents / budgetCents) * 100, 100) : 0
    const avgDailySpend =
      Object.values(dailySpend).reduce((sum, v) => sum + v, 0) /
      Math.max(Object.values(dailySpend).filter((v) => v > 0).length, 1)
    const daysRemaining = avgDailySpend > 0 ? Math.round((budgetCents - totalSpendCents) / 100 / avgDailySpend) : null

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        title: campaign.title,
        status: campaign.status,
        objective: campaign.objective,
        bidType: campaign.bid_type,
        budgetCents,
        spentCents: campaign.spent_cents ?? 0,
        maxBidCpm: campaign.max_bid_cpm ?? 0,
        contexts: campaign.contexts ?? [],
        createdAt: campaign.created_at,
      },
      totals: {
        spendCents: totalSpendCents,
        impressions: totalImpressions,
        clicks: totalClicks,
        conversions: totalConversions,
        ctr: Number(ctr.toFixed(2)),
        cpc,
        cpm,
        cpa,
        cvr: Number(cvr.toFixed(2)),
        reach,
        frequency: Number(frequency.toFixed(2)),
        percentUsed: Number(percentUsed.toFixed(1)),
        daysRemaining,
      },
      chartData,
      contextBreakdown,
      sourceBreakdown,
      recentActivity,
    })
  } catch (err) {
    console.error('GET /api/campaigns/[id]/analytics error:', err)
    return NextResponse.json({ error: "We couldn't load campaign analytics right now. Please refresh or try again later.", code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

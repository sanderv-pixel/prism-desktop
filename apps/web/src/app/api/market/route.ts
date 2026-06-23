import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

interface MarketContextRequest {
  contexts?: string[]
  bidCpm?: number
}

const FALLBACK_FLOOR_CPM = 800

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return sorted[0]
  const index = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const weight = index - lower
  return Math.round(sorted[lower] * (1 - weight) + sorted[upper] * weight)
}

export async function POST(req: NextRequest) {
  const body: MarketContextRequest = await req.json().catch(() => ({}))
  const contexts = Array.isArray(body.contexts) ? body.contexts : []
  const bidCpm = body.bidCpm ?? 0

  const supabase = createAdminClient()

  // Active campaigns with remaining budget.
  let query = supabase
    .from('campaigns')
    .select('id, max_bid_cpm, spent_cents, budget_cents')
    .eq('status', 'active')
    .eq('objective', 'awareness')
    .eq('bid_type', 'cpm')
    .gt('budget_cents', 0)

  if (contexts.length > 0) {
    query = query.overlaps('contexts', contexts)
  }

  const { data: campaigns, error } = await query
  if (error) {
    console.error('Market context error:', error)
    return NextResponse.json({ error: "Market data is temporarily unavailable. Please try again later.", code: 'INTERNAL_ERROR' }, { status: 500 })
  }

  const eligible = (campaigns ?? []).filter((c) => c.spent_cents < c.budget_cents)
  const bids = eligible.map((c) => c.max_bid_cpm).sort((a, b) => a - b)

  // Published floor for this context.
  const { data: floors } = await supabase
    .from('market_floors')
    .select('floor_cpm')
    .in('context', contexts.length > 0 ? contexts : ['general'])
    .order('floor_cpm', { ascending: false })
    .limit(1)

  const floorCpm = floors && floors.length > 0 ? floors[0].floor_cpm : FALLBACK_FLOOR_CPM

  // Count impressions for these campaigns in the last 30 days.
  const campaignIds = eligible.map((c) => c.id)
  let impressionsLast30d = 0
  if (campaignIds.length > 0) {
    const since = new Date()
    since.setDate(since.getDate() - 30)
    const { count, error: countError } = await supabase
      .from('impressions')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', campaignIds)
      .gte('created_at', since.toISOString())
    if (!countError && count !== null) {
      impressionsLast30d = count
    }
  }

  // Suggested bid is the 75th percentile, floored at the market floor.
  const suggestedBid = Math.max(floorCpm, percentile(bids, 75))

  // Win-rate estimate: the share of competing bids your max CPM would beat in the
  // auction. Ties (an equal max bid) are broken by predicted quality, so they count
  // as roughly half a win instead of a loss; with no competitors your bid is
  // uncontested. Competitiveness is derived FROM the win rate so the label and colour
  // always agree with it (a high win rate is a low-competition, "likely to win" case).
  let competitiveness: 'low' | 'medium' | 'high' | 'very-high' = 'low'
  let winRateEstimate = 0
  if (bidCpm > 0) {
    if (bids.length === 0) {
      winRateEstimate = 100
      competitiveness = 'low'
    } else {
      const beaten = bids.filter((b) => b < bidCpm).length
      const tied = bids.filter((b) => b === bidCpm).length
      winRateEstimate = Math.round(((beaten + tied * 0.5) / bids.length) * 100)
      if (winRateEstimate >= 75) competitiveness = 'low'
      else if (winRateEstimate >= 45) competitiveness = 'medium'
      else if (winRateEstimate >= 20) competitiveness = 'high'
      else competitiveness = 'very-high'
    }
  }

  return NextResponse.json({
    activeCampaigns: eligible.length,
    totalImpressionsLast30d: impressionsLast30d,
    floorCpm,
    suggestedBid,
    competitiveness,
    winRateEstimate,
  })
}

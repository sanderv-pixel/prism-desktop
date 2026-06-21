export interface Advertiser {
  id: string
  name: string
  status: string
  subscription_status: string
  balance_cents: number
  lifetime_deposits_cents: number
}

export interface Campaign {
  id: string
  advertiser_id: string
  title: string
  objective: string
  bid_type: string
  max_bid_cpm: number
  max_bid_cpc?: number | null
  budget_cents: number
  spent_cents: number
  status: string
  contexts?: string[]
  created_at: string
  updated_at: string
  impression_count?: number
  click_count?: number
}

export interface Impression {
  campaign_id: string
  auction_price_cpm: number | null
  bid_type?: string | null
  payout_millicents?: number | null
  session_id?: string | null
  context?: string | null
  source?: string | null
  created_at: string
}

export interface Click {
  campaign_id: string
  created_at: string
}

export interface Conversion {
  campaign_id: string
  value_cents: number
  created_at: string
}

export interface DailySpendRow {
  campaign_id: string
  spend_date: string
  spent_cents: number
  impressions: number
}

export interface AnalyticsBreakdowns {
  reach: number
  source: { name: string; impressions: number; spend: number }[]
  context: { name: string; impressions: number; spend: number }[]
}

export interface AdvertiserStatsResult {
  advertiser: {
    id: string
    name: string
    status: string
    subscriptionStatus: string
    balanceCents: number
    lifetimeDepositsCents: number
  }
  stats: {
    totalSpendCents: number
    totalBudgetCents: number
    remainingBudgetCents: number
    totalImpressions: number
    totalClicks: number
    totalConversions: number
    ctr: number
    cpm: number
    cpc: number
    cpa: number
    cvr: number
    roas: number
    conversionValueCents: number
    reach: number
    frequency: number
    activeCampaigns: number
    totalCampaigns: number
    spendChange: number
  }
  chartData: { date: string; spend: number; impressions: number; clicks: number }[]
  contextBreakdown: { name: string; impressions: number; spend: number; clicks: number }[]
  sourceBreakdown: { name: string; impressions: number; spend: number }[]
  campaigns: {
    id: string
    title: string
    status: string
    objective: string
    bidType: string
    budgetCents: number
    spentCents: number
    maxBidCpm: number
    contexts: string[]
    impressions: number
    clicks: number
    conversions: number
    ctr: number
    cpm: number
    cpc: number
    createdAt: string
    updatedAt: string
  }[]
}

const MAX_ALL_DAYS = 365

function getStartOfDay(daysAgo: number, now: Date) {
  const d = new Date(now)
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - daysAgo)
  return d
}

// Advertiser cost for one impression. CPM impressions cost the full auction
// clearing price (auction_price_cpm is cents per 1000 impressions). CPC impressions
// cost nothing until clicked, when the realized cost is 2x the creator payout
// recorded on the row (the creator earns 50%). Matches the millicent spent_cents ledger.
function impressionSpendCents(i: Impression) {
  if (i.bid_type === 'cpc') return ((i.payout_millicents ?? 0) * 2) / 1000
  return (i.auction_price_cpm ?? 0) / 1000
}

export function computeAdvertiserStats(
  advertiser: Advertiser,
  campaigns: Campaign[],
  impressions: Impression[],
  clicks: Click[],
  conversions: Conversion[],
  days: number | 'all' = 30,
  now = new Date(),
  dailySpendRows: DailySpendRow[] = [],
  breakdowns: AnalyticsBreakdowns = { reach: 0, source: [], context: [] }
): AdvertiserStatsResult {
  const daysValue = days === 'all' ? MAX_ALL_DAYS : days
  const periodStart = new Date(now.getTime() - daysValue * 24 * 60 * 60 * 1000)
  const previousPeriodStart = new Date(now.getTime() - 2 * daysValue * 24 * 60 * 60 * 1000)

  const totalSpendCents = campaigns.reduce((sum, c) => sum + (c.spent_cents ?? 0), 0)
  const totalBudgetCents = campaigns.reduce((sum, c) => sum + (c.budget_cents ?? 0), 0)
  const activeCampaigns = campaigns.filter((c) => c.status === 'active').length

  const recentImpressions = impressions.filter((i) => new Date(i.created_at) >= periodStart)
  const previousImpressions = impressions.filter((i) => {
    const d = new Date(i.created_at)
    return d >= previousPeriodStart && d < periodStart
  })

  const recentClicks = clicks.filter((c) => new Date(c.created_at) >= periodStart)
  const previousClicks = clicks.filter((c) => {
    const d = new Date(c.created_at)
    return d >= previousPeriodStart && d < periodStart
  })

  const spendFromImpressions = (items: Impression[]) =>
    items.reduce((sum, i) => sum + impressionSpendCents(i), 0)

  const recentSpend = spendFromImpressions(recentImpressions)
  const previousSpend = spendFromImpressions(previousImpressions)
  const spendChange =
    previousSpend === 0 ? 0 : Math.round(((recentSpend - previousSpend) / previousSpend) * 100)

  // Headline counts come from the maintained per-campaign counters (impression_count,
  // click_count, spent_cents), not from fetched rows — rows are capped at 1000 by the
  // API, which made high-volume campaigns appear "stuck at 1000". These counters are
  // the billable totals and reconcile with spend.
  const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impression_count ?? 0), 0)
  const totalClicks = campaigns.reduce((sum, c) => sum + (c.click_count ?? 0), 0)
  const totalConversions = conversions.filter((c) => new Date(c.created_at) >= periodStart).length
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const cvr = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0
  const cpm = totalImpressions > 0 ? Math.round((totalSpendCents / totalImpressions) * 1000) : 0
  const cpc = totalClicks > 0 ? Math.round(totalSpendCents / totalClicks) : 0
  const cpa = totalConversions > 0 ? Math.round(recentSpend / totalConversions) : 0
  // ROAS = conversion value returned per dollar of spend (e.g. 2.0 = $2 back per $1).
  const conversionValueCents = conversions
    .filter((c) => new Date(c.created_at) >= periodStart)
    .reduce((s, c) => s + (c.value_cents ?? 0), 0)
  const roas = totalSpendCents > 0 ? conversionValueCents / totalSpendCents : 0

  // Reach comes from the DB aggregation (distinct sessions, uncapped).
  const reach = breakdowns.reach ?? 0
  const frequency = reach > 0 ? totalImpressions / reach : 0

  const dailySpend: Record<string, number> = {}
  const dailyImpressions: Record<string, number> = {}
  const dailyClicks: Record<string, number> = {}
  for (let i = daysValue - 1; i >= 0; i--) {
    const d = getStartOfDay(i, now)
    const key = d.toISOString().split('T')[0]
    dailySpend[key] = 0
    dailyImpressions[key] = 0
    dailyClicks[key] = 0
  }

  // Daily spend + impressions come from the maintained daily counters so the chart
  // isn't truncated by the 1000-row impression fetch. Summed across the advertiser's
  // campaigns per day.
  for (const row of dailySpendRows) {
    const key = row.spend_date
    if (dailySpend[key] !== undefined) {
      dailySpend[key] += (row.spent_cents ?? 0) / 100
      dailyImpressions[key] += row.impressions ?? 0
    }
  }
  for (const click of recentClicks) {
    const key = click.created_at.split('T')[0]
    if (dailyClicks[key] !== undefined) {
      dailyClicks[key] += 1
    }
  }

  const conversionsByCampaign = new Map<string, Conversion[]>()
  for (const conv of conversions) {
    const list = conversionsByCampaign.get(conv.campaign_id) ?? []
    list.push(conv)
    conversionsByCampaign.set(conv.campaign_id, list)
  }

  const campaignStats = campaigns.map((c) => {
    const campaignConversions = conversionsByCampaign.get(c.id) ?? []
    const campaignImpressionsCount = c.impression_count ?? 0
    const campaignClicksCount = c.click_count ?? 0
    const campaignSpend = c.spent_cents ?? 0
    const ctrValue =
      campaignImpressionsCount > 0 ? (campaignClicksCount / campaignImpressionsCount) * 100 : 0
    const cpmValue =
      campaignImpressionsCount > 0
        ? Math.round((campaignSpend / campaignImpressionsCount) * 1000)
        : 0
    const cpcValue = campaignClicksCount > 0 ? Math.round(campaignSpend / campaignClicksCount) : 0
    return {
      id: c.id,
      title: c.title,
      status: c.status,
      objective: c.objective,
      bidType: c.bid_type,
      budgetCents: c.budget_cents,
      spentCents: c.spent_cents,
      maxBidCpm: c.max_bid_cpm,
      maxBidCpc: c.max_bid_cpc ?? null,
      contexts: c.contexts ?? [],
      impressions: campaignImpressionsCount,
      clicks: campaignClicksCount,
      conversions: campaignConversions.length,
      ctr: Number(ctrValue.toFixed(2)),
      cpm: cpmValue,
      cpc: cpcValue,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }
  })

  // Context + source breakdowns come from the DB aggregation (uncapped, billable).
  // The Click type carries no context, so clicks stay 0 in the context breakdown.
  const contextBreakdown = (breakdowns.context ?? []).slice(0, 8).map((c) => ({
    name: c.name,
    impressions: c.impressions,
    spend: c.spend,
    clicks: 0,
  }))

  const SOURCE_LABELS: Record<string, string> = {
    claude: 'Claude',
    cursor: 'Cursor',
    codex: 'Codex',
    terminal: 'Terminal',
    unknown: 'Unknown',
  }
  const sourceBreakdown = (breakdowns.source ?? []).map((s) => ({
    name: SOURCE_LABELS[s.name] ?? 'Unknown',
    impressions: s.impressions,
    spend: s.spend,
  }))

  return {
    advertiser: {
      id: advertiser.id,
      name: advertiser.name,
      status: advertiser.status,
      subscriptionStatus: advertiser.subscription_status,
      balanceCents: advertiser.balance_cents ?? 0,
      lifetimeDepositsCents: advertiser.lifetime_deposits_cents ?? 0,
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
      roas: Number(roas.toFixed(2)),
      conversionValueCents,
      reach,
      frequency: Number(frequency.toFixed(2)),
      activeCampaigns,
      totalCampaigns: campaigns.length,
      spendChange,
    },
    chartData: Object.entries(dailySpend).map(([date, spend]) => ({
      date,
      spend: Number(spend.toFixed(2)),
      impressions: dailyImpressions[date],
      clicks: dailyClicks[date],
    })),
    contextBreakdown,
    sourceBreakdown,
    campaigns: campaignStats,
  }
}

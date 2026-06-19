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
  budget_cents: number
  spent_cents: number
  status: string
  contexts?: string[]
  created_at: string
  updated_at: string
}

export interface Impression {
  campaign_id: string
  auction_price_cpm: number | null
  session_id?: string | null
  context?: string | null
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
    reach: number
    frequency: number
    activeCampaigns: number
    totalCampaigns: number
    spendChange: number
  }
  chartData: { date: string; spend: number; impressions: number; clicks: number }[]
  contextBreakdown: { name: string; impressions: number; spend: number; clicks: number }[]
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

export function computeAdvertiserStats(
  advertiser: Advertiser,
  campaigns: Campaign[],
  impressions: Impression[],
  clicks: Click[],
  conversions: Conversion[],
  days: number | 'all' = 30,
  now = new Date()
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
    items.reduce((sum, i) => sum + impressionSpendCents(i.auction_price_cpm), 0)

  const recentSpend = spendFromImpressions(recentImpressions)
  const previousSpend = spendFromImpressions(previousImpressions)
  const spendChange =
    previousSpend === 0 ? 0 : Math.round(((recentSpend - previousSpend) / previousSpend) * 100)

  const totalImpressions = recentImpressions.length
  const totalClicks = recentClicks.length
  const totalConversions = conversions.filter((c) => new Date(c.created_at) >= periodStart).length
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const cvr = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0
  const cpm = totalImpressions > 0 ? Math.round((recentSpend / totalImpressions) * 1000) : 0
  const cpc = totalClicks > 0 ? Math.round(recentSpend / totalClicks) : 0
  const cpa = totalConversions > 0 ? Math.round(recentSpend / totalConversions) : 0

  const recentSessions = new Set(recentImpressions.map((i) => i.session_id).filter(Boolean))
  const reach = recentSessions.size
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

  for (const imp of recentImpressions) {
    const key = imp.created_at.split('T')[0]
    if (dailySpend[key] !== undefined) {
      dailySpend[key] += impressionSpendCents(imp.auction_price_cpm) / 100
      dailyImpressions[key] += 1
    }
  }
  for (const click of recentClicks) {
    const key = click.created_at.split('T')[0]
    if (dailyClicks[key] !== undefined) {
      dailyClicks[key] += 1
    }
  }

  const impressionsByCampaign = new Map<string, Impression[]>()
  for (const imp of impressions) {
    const list = impressionsByCampaign.get(imp.campaign_id) ?? []
    list.push(imp)
    impressionsByCampaign.set(imp.campaign_id, list)
  }
  const clicksByCampaign = new Map<string, Click[]>()
  for (const click of clicks) {
    const list = clicksByCampaign.get(click.campaign_id) ?? []
    list.push(click)
    clicksByCampaign.set(click.campaign_id, list)
  }
  const conversionsByCampaign = new Map<string, Conversion[]>()
  for (const conv of conversions) {
    const list = conversionsByCampaign.get(conv.campaign_id) ?? []
    list.push(conv)
    conversionsByCampaign.set(conv.campaign_id, list)
  }

  const campaignStats = campaigns.map((c) => {
    const campaignImpressions = impressionsByCampaign.get(c.id) ?? []
    const campaignClicks = clicksByCampaign.get(c.id) ?? []
    const campaignConversions = conversionsByCampaign.get(c.id) ?? []
    const campaignImpressionsCount = campaignImpressions.length
    const campaignClicksCount = campaignClicks.length
    const campaignSpend = campaignImpressions.reduce(
      (sum, i) => sum + impressionSpendCents(i.auction_price_cpm),
      0
    )
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

  const contextMap = new Map<string, { impressions: number; spend: number; clicks: number }>()
  for (const imp of recentImpressions) {
    const key = parseContextKey(imp.context)
    const current = contextMap.get(key) ?? { impressions: 0, spend: 0, clicks: 0 }
    current.impressions += 1
    current.spend += impressionSpendCents(imp.auction_price_cpm) / 100
    contextMap.set(key, current)
  }
  // Attribution: count a click toward the context of its matching impression if possible.
  // Simpler: clicks are attributed to the campaign, so we approximate by parsing click context if available.
  // The Click type has no context; leave clicks at 0 in context breakdown.
  const contextBreakdown = Array.from(contextMap.entries())
    .map(([name, vals]) => ({ name, ...vals }))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 8)

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
    campaigns: campaignStats,
  }
}

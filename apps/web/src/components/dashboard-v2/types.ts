/** Shared shapes for the earner dashboard (from /api/dashboard). */

export interface ConnectStatus {
  onboardingComplete: boolean
  payoutsEnabled: boolean
  chargesEnabled: boolean
  kycStatus: string
  provider: string | null
  configured: boolean
}

export interface DashboardData {
  user: {
    id: string
    email: string
    payoutEnabled: boolean
    payoutHold: boolean
    connectStatus: ConnectStatus
  }
  stats: {
    totalEarningsCents: number
    ownEarningsCents: number
    referralEarningsCents: number
    balanceCents: number
    totalImpressions: number
    validatedImpressions: number
    clicks: number
    ctr: number
    avgDurationMs: number
    earningsChange: number
    impressionsChange: number
    pendingPayoutCents: number
    last30EarningsCents: number
  }
  referral: {
    referralCode: string | null
    referredCount: number
    referralEarningsCents: number
  }
  chartData: { date: string; earnings: number; impressions: number }[]
  toolBreakdown: { tool: string; count: number; earnings: number }[]
  insights: {
    hourly: { h: number; mc: number }[]
    dow: { d: number; mc: number }[]
    totalDurationMs: number
    totalViews: number
    maxPayoutCents: number
  }
  recentImpressions: {
    id: string
    advertiserName: string
    campaignTitle: string
    context: unknown
    validated: boolean
    paid: boolean
    notPaidReason: string | null
    payoutCents: number
    createdAt: string
  }[]
  payouts: {
    id: string
    amountCents: number
    status: string
    createdAt: string
    paidAt: string | null
  }[]
}

export interface DeviceInfo {
  id: string
  createdAt: string
  lastUsedAt: string | null
  lastSeenIp: string | null
  hasFingerprint: boolean
  revoked: boolean
  active: boolean
}

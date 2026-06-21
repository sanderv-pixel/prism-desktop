import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'

function getStartOfDay(daysAgo: number) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - daysAgo)
  return d
}

async function getConnectStatus(userId: string) {
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('builder_payout_settings')
    .select('onboarding_complete, payouts_enabled, charges_enabled, kyc_status, payout_provider, recipient_details')
    .eq('auth_user_id', userId)
    .maybeSingle()

  const provider = data?.payout_provider ?? null
  const recipientDetails = (data?.recipient_details as Record<string, unknown> | null) ?? null
  const configured = Boolean(provider && recipientDetails)

  return {
    onboardingComplete: data?.onboarding_complete ?? false,
    payoutsEnabled: data?.payouts_enabled ?? false,
    chargesEnabled: data?.charges_enabled ?? false,
    kycStatus: data?.kyc_status ?? 'unverified',
    provider,
    configured,
  }
}

async function getReferralSnapshot(userId: string) {
  const adminClient = createAdminClient()
  const { data: ownReferral } = await adminClient
    .from('referrals')
    .select('referral_code')
    .eq('user_id', userId)
    .maybeSingle()

  const { count: referredCount } = await adminClient
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referred_by', userId)

  return {
    referralCode: ownReferral?.referral_code ?? null,
    referredCount: referredCount ?? 0,
  }
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: identities } = await supabase
      .from('builder_identities')
      .select('anonymous_user_id')
      .eq('auth_user_id', user.id)

    const userIds = [user.id, ...(identities ?? []).map((i) => i.anonymous_user_id)]

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgoIso = thirtyDaysAgo.toISOString()
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgoIso = sixtyDaysAgo.toISOString()

    const [
      impressionsResult,
      referralImpressionsResult,
      recentImpressionsListResult,
      payoutsResult,
      pendingPayoutsResult,
      connectStatus,
      referralSnapshot,
    ] = await Promise.all([
      // Single bounded scan for all dashboard aggregations.
      supabase
        .from('impressions')
        .select('context, payout_millicents, duration_ms, validated, payout_hold, created_at')
        .in('user_id', userIds)
        .gte('created_at', sixtyDaysAgoIso),
      // Referrer earnings from referred creators.
      supabase
        .from('impressions')
        .select('referrer_payout_millicents, validated, payout_hold, created_at')
        .eq('referrer_user_id', user.id)
        .gte('created_at', sixtyDaysAgoIso),
      // Last 20 impressions for the activity feed.
      supabase
        .from('impressions')
        .select('*')
        .in('user_id', userIds)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('payouts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('payouts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending_review'),
      getConnectStatus(user.id),
      getReferralSnapshot(user.id),
    ])

    const impressions = impressionsResult.data ?? []
    const referralImpressions = referralImpressionsResult.data ?? []
    const recentList = recentImpressionsListResult.data ?? []
    const payouts = payoutsResult.data ?? []
    const pendingPayouts = pendingPayoutsResult.data ?? []

    const eligibleImpressions = impressions.filter((i) => i.validated && !i.payout_hold)
    const eligibleRecent = eligibleImpressions.filter((i) => new Date(i.created_at) >= thirtyDaysAgo)
    const eligiblePrevious = eligibleImpressions.filter((i) => {
      const d = new Date(i.created_at)
      return d >= sixtyDaysAgo && d < thirtyDaysAgo
    })

    const eligibleReferralImpressions = referralImpressions.filter(
      (i) => i.validated && !i.payout_hold
    )
    const eligibleReferralRecent = eligibleReferralImpressions.filter(
      (i) => new Date(i.created_at) >= thirtyDaysAgo
    )
    const eligibleReferralPrevious = eligibleReferralImpressions.filter((i) => {
      const d = new Date(i.created_at)
      return d >= sixtyDaysAgo && d < thirtyDaysAgo
    })

    // Sums are in millicents; divide by 1000 to express the existing *Cents
    // variables as (now fractional) cents so all downstream display is unchanged.
    const ownEarningsCents = eligibleImpressions.reduce(
      (sum, i) => sum + i.payout_millicents,
      0
    ) / 1000
    const referralEarningsCents = eligibleReferralImpressions.reduce(
      (sum, i) => sum + i.referrer_payout_millicents,
      0
    ) / 1000
    const totalEarningsCents = ownEarningsCents + referralEarningsCents
    const validatedImpressions = eligibleImpressions.length
    const totalImpressions = impressions.length
    const clicks = eligibleImpressions.filter((i) =>
      typeof i.context === 'string' ? i.context.includes('click') : false
    ).length
    const ctr = validatedImpressions > 0 ? (clicks / validatedImpressions) * 100 : 0

    const recentEarnings = eligibleRecent.reduce((sum, i) => sum + i.payout_millicents, 0) / 1000
    const previousEarnings = eligiblePrevious.reduce((sum, i) => sum + i.payout_millicents, 0) / 1000
    const referralRecentEarnings = eligibleReferralRecent.reduce(
      (sum, i) => sum + i.referrer_payout_millicents,
      0
    ) / 1000
    const referralPreviousEarnings = eligibleReferralPrevious.reduce(
      (sum, i) => sum + i.referrer_payout_millicents,
      0
    ) / 1000
    const totalRecentEarnings = recentEarnings + referralRecentEarnings
    const totalPreviousEarnings = previousEarnings + referralPreviousEarnings
    const earningsChange =
      totalPreviousEarnings === 0
        ? 100
        : Math.round(((totalRecentEarnings - totalPreviousEarnings) / totalPreviousEarnings) * 100)

    const recentCount = eligibleRecent.length
    const previousCount = eligiblePrevious.length
    const impressionsChange =
      previousCount === 0
        ? 100
        : Math.round(((recentCount - previousCount) / previousCount) * 100)

    const MIN_PAYOUT_CENTS = 2000
    const totalPayoutCents = payouts
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount_cents, 0)
    const inFlightPayoutCents = pendingPayouts.reduce(
      (sum, p) => sum + p.amount_cents,
      0
    )
    const balanceCents = totalEarningsCents - totalPayoutCents - inFlightPayoutCents
    const payoutEnabled = balanceCents >= MIN_PAYOUT_CENTS && connectStatus.configured

    const dailyEarnings: Record<string, number> = {}
    const dailyImpressions: Record<string, number> = {}
    for (let i = 29; i >= 0; i--) {
      const d = getStartOfDay(i)
      const key = d.toISOString().split('T')[0]
      dailyEarnings[key] = 0
      dailyImpressions[key] = 0
    }

    for (const imp of eligibleRecent) {
      const key = imp.created_at.split('T')[0]
      if (dailyEarnings[key] !== undefined) {
        dailyEarnings[key] += imp.payout_millicents / 100000
        dailyImpressions[key] += 1
      }
    }

    for (const imp of eligibleReferralRecent) {
      const key = imp.created_at.split('T')[0]
      if (dailyEarnings[key] !== undefined) {
        dailyEarnings[key] += imp.referrer_payout_millicents / 100000
      }
    }

    const toolBreakdown: Record<string, { count: number; earnings: number }> = {}
    for (const imp of eligibleRecent) {
      let tool = 'Unknown'
      if (typeof imp.context === 'string') {
        try {
          const parsed = JSON.parse(imp.context)
          tool = parsed.aiTool ?? parsed.editor ?? 'Unknown'
        } catch {
          tool = imp.context
        }
      }
      if (!toolBreakdown[tool]) {
        toolBreakdown[tool] = { count: 0, earnings: 0 }
      }
      toolBreakdown[tool].count += 1
      toolBreakdown[tool].earnings += imp.payout_millicents / 100000
    }

    const durations = eligibleImpressions
      .filter((i) => i.duration_ms)
      .map((i) => i.duration_ms ?? 0)
    const avgDurationMs =
      durations.length > 0
        ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
        : 0

    const { data: trustRows } = await supabase
      .from('user_trust')
      .select('payout_hold')
      .in('user_id', userIds)
    const payoutHold = (trustRows ?? []).some((t) => t.payout_hold)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        payoutEnabled,
        payoutHold,
        connectStatus,
      },
      stats: {
        totalEarningsCents,
        ownEarningsCents,
        referralEarningsCents,
        balanceCents: Math.max(0, balanceCents),
        totalImpressions,
        validatedImpressions,
        clicks,
        ctr: Number(ctr.toFixed(2)),
        avgDurationMs,
        earningsChange,
        impressionsChange,
        pendingPayoutCents: inFlightPayoutCents,
        // Precise last-30-day total (own + referral), summed from millicents, so
        // the 30-day card never disagrees with the balance for low-volume creators.
        last30EarningsCents: totalRecentEarnings,
      },
      referral: {
        referralCode: referralSnapshot.referralCode,
        referredCount: referralSnapshot.referredCount,
        referralEarningsCents,
      },
      chartData: Object.entries(dailyEarnings).map(([date, earnings]) => ({
        date,
        earnings: Number(earnings.toFixed(4)),
        impressions: dailyImpressions[date],
      })),
      toolBreakdown: Object.entries(toolBreakdown)
        .map(([tool, data]) => ({ tool, ...data }))
        .sort((a, b) => b.earnings - a.earnings),
      recentImpressions: recentList.map((imp) => {
        const flags: string[] = imp.fraud_flags ?? []
        // A CPC impression earns only when its ad is clicked; until then it is a
        // legitimate unpaid impression, not a rejected one.
        const cpcAwaitingClick =
          imp.bid_type === 'cpc' &&
          imp.validated &&
          !imp.payout_hold &&
          (imp.payout_millicents ?? 0) === 0
        const paid = imp.validated && !imp.payout_hold && !cpcAwaitingClick
        const notPaidReason = paid
          ? null
          : cpcAwaitingClick
            ? 'Pays when clicked'
            : flags.includes('frequency_cap')
            ? 'Frequency cap reached'
            : flags.some((f) => f.startsWith('budget'))
              ? 'Advertiser out of budget'
              : flags.includes('daily_spend_cap')
                ? 'Advertiser daily cap reached'
                : imp.payout_hold || flags.includes('low_trust_score')
                  ? 'On payout hold'
                  : flags.includes('impression_too_fast') ||
                      flags.includes('device_fingerprint_mismatch') ||
                      flags.includes('too_many_users_on_ip')
                    ? 'Flagged by fraud checks'
                    : 'Not billable'
        return {
          id: imp.id,
          advertiserName: 'Prism',
          campaignTitle: 'Ad impression',
          context: imp.context,
          validated: imp.validated,
          paid,
          notPaidReason,
          payoutCents: imp.payout_millicents / 1000,
          durationMs: imp.duration_ms,
          createdAt: imp.created_at,
        }
      }),
      payouts: payouts.map((p) => ({
        id: p.id,
        amountCents: p.amount_cents,
        status: p.status,
        createdAt: p.created_at,
        paidAt: p.paid_at,
      })),
    })
  } catch (err) {
    console.error('GET /api/dashboard error:', err)
    return NextResponse.json(
      { error: "We couldn't load your dashboard right now. Please refresh or try again later.", code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

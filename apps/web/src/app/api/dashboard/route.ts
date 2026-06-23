import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { RateLimiter, rateLimitResponse } from '@/lib/api/rate-limit'

export const dynamic = 'force-dynamic'

// Per-user limit: the dashboard is a heavy read; cap polling/abuse.
const dashboardRateLimiter = new RateLimiter(60, 60 * 1000)

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

function isValidTimeZone(tz: string): boolean {
  if (!tz) return false
  try {
    Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = await dashboardRateLimiter.check(`dashboard:${user.id}`)
  if (!rl.success) {
    return rateLimitResponse(rl.limit, rl.resetAt)
  }

  // Viewer timezone (IANA), so "best earning times" buckets in their local time.
  const tzParam = new URL(req.url).searchParams.get('tz') ?? ''
  const tz = isValidTimeZone(tzParam) ? tzParam : 'UTC'

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
      // Recent impressions for the activity feed + the earnings page list
      // (filterable / paginated client-side, so fetch a fuller recent window).
      supabase
        .from('impressions')
        .select('*')
        .in('user_id', userIds)
        .order('created_at', { ascending: false })
        .limit(100),
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

    // Daily chart, by-tool breakdown, validated/total counts, this-month total,
    // and the deltas all come from a SQL aggregation so they stay accurate at any
    // volume. The raw `impressions` row scan above is capped at 1000 rows, which
    // silently dropped recent days (incl. today) for high-volume creators.
    // Cast: this function is newer than the checked-in generated Supabase types.
    // `.bind(admin)` is required: a bare `admin.rpc` reference loses its `this`,
    // so the method reads `this.rest` on undefined and throws ("reading 'rest'").
    const rpc = admin.rpc.bind(admin) as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: unknown }>
    const { data: seriesData } = await rpc('creator_dashboard_series', {
      p_user_ids: userIds,
      p_referrer: user.id,
      p_days: 30,
    })
    const series = (seriesData ?? {}) as {
      daily?: { day: string; own_mc: number; ref_mc: number; impressions: number }[]
      tools?: { tool: string; mc: number; cnt: number }[]
      validated_impressions?: number
      total_impressions?: number
      own_mc_win?: number
      own_mc_prev?: number
      cnt_win?: number
      cnt_prev?: number
      ref_mc_win?: number
      ref_mc_prev?: number
    }

    // Insights aggregate (all-time): earnings by hour/day-of-week, lifetime
    // monetized wait time, eligible view count, and the highest-paying view.
    const { data: insightsData } = await rpc('creator_insights', { p_user_ids: userIds, p_tz: tz })
    const insights = (insightsData ?? {}) as {
      hourly?: { h: number; mc: number }[]
      dow?: { d: number; mc: number }[]
      total_duration_ms?: number
      total_views?: number
      max_payout_mc?: number
    }

    // Lifetime earnings come from an uncapped SQL aggregate, not the 60-day row
    // scan above: the balance must include all-time own earnings and lifelong
    // referral commission, and must not be truncated by the 1000-row fetch cap.
    const { data: totalsRows } = await admin.rpc('creator_earnings_totals', {
      p_user_ids: userIds,
      p_referrer_id: user.id,
    })
    const totals = totalsRows?.[0] ?? { own_millicents: 0, referral_millicents: 0 }
    const ownEarningsCents = Number(totals.own_millicents) / 1000
    const referralEarningsCents = Number(totals.referral_millicents) / 1000
    const totalEarningsCents = ownEarningsCents + referralEarningsCents
    const validatedImpressions = Number(series.validated_impressions ?? eligibleImpressions.length)
    const totalImpressions = Number(series.total_impressions ?? impressions.length)
    const clicks = eligibleImpressions.filter((i) =>
      typeof i.context === 'string' ? i.context.includes('click') : false
    ).length
    const ctr = validatedImpressions > 0 ? (clicks / validatedImpressions) * 100 : 0

    const totalRecentEarnings =
      (Number(series.own_mc_win ?? 0) + Number(series.ref_mc_win ?? 0)) / 1000
    const totalPreviousEarnings =
      (Number(series.own_mc_prev ?? 0) + Number(series.ref_mc_prev ?? 0)) / 1000
    const earningsChange =
      totalPreviousEarnings === 0
        ? 100
        : Math.round(((totalRecentEarnings - totalPreviousEarnings) / totalPreviousEarnings) * 100)

    const recentCount = Number(series.cnt_win ?? 0)
    const previousCount = Number(series.cnt_prev ?? 0)
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

    // Daily series (zero-filled for p_days) and tool breakdown, from the SQL
    // aggregation. earnings are dollars (millicents / 100000).
    const chartData = (series.daily ?? []).map((d) => ({
      date: d.day,
      earnings: Number(((Number(d.own_mc) + Number(d.ref_mc)) / 100000).toFixed(4)),
      impressions: Number(d.impressions),
    }))

    const toolBreakdown = (series.tools ?? []).map((t) => ({
      tool: t.tool,
      count: Number(t.cnt),
      earnings: Number((Number(t.mc) / 100000).toFixed(4)),
    }))

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
      chartData,
      toolBreakdown,
      insights: {
        hourly: insights.hourly ?? [],
        dow: insights.dow ?? [],
        totalDurationMs: Number(insights.total_duration_ms ?? 0),
        totalViews: Number(insights.total_views ?? 0),
        maxPayoutCents: Number(insights.max_payout_mc ?? 0) / 1000,
      },
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
            : flags.includes('session_pace_cap')
            ? 'Session pacing limit'
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

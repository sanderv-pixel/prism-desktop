import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/utils/supabase/admin'
import { RateLimiter, getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'
import { handleApiError, ApiError } from '@/lib/api/errors'
import { requireApiKey, getRequestDeviceUserId } from '@/lib/api/auth'
import { isTrustedUserId } from '@/lib/api/trusted'
import {
  evaluateFraud,
  contextHash,
  evaluateDeviceFingerprint,
  getUserCampaignFrequencyCount,
} from '@/lib/api/fraud'
import { verifyImpressionToken, isNonceUsed } from '@/lib/api/tokens'
import { detectImpressionAnomalies, detectBudgetDrainAnomaly } from '@/lib/anomaly'
import { maybeAutoRecharge } from '@/lib/autoRecharge'
import {
  sendCampaignBudgetExhaustedEmail,
  maybeSendLowBalanceEmail,
  getAdvertiserById,
} from '@/lib/email/helpers'

export const dynamic = 'force-dynamic'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Prism-Api-Key',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

const impressionsRateLimiter = new RateLimiter(30, 60 * 1000)
const MAX_DAILY_SPEND_CENTS = 50000 // $500/day cap per campaign
const MAX_DAILY_SPEND_MILLICENTS = MAX_DAILY_SPEND_CENTS * 1000
const MIN_TRUST_SCORE_FOR_PAYOUT = 20
const MIN_ATTENTION_MS = 800

// A reported dwell can't exceed how long the impression token has existed (both
// timestamps are server-side). The grace absorbs network latency on the report;
// legitimate clients always have token-age >= dwell, so this never trips them.
const DWELL_GRACE_MS = 2000
const DWELL_BLOCK_SCORE = 10

const RequestSchema = z.object({
  userId: z.string().min(1).max(128),
  sessionId: z.string().min(1).max(128),
  campaignId: z.string().uuid(),
  impressionToken: z.string().min(1),
  context: z.union([z.string(), z.record(z.any())]).optional(),
  durationMs: z.number().int().min(MIN_ATTENTION_MS).max(600 * 1000),
  fingerprint: z.union([z.string(), z.record(z.any())]).optional(),
  // The surface the ad was shown on, for advertiser reporting. Informational
  // only (client-reported), so it never affects validation or payout.
  source: z.enum(['claude', 'cursor', 'terminal', 'codex', 'unknown']).optional(),
})

function getRateLimitKey(userId: string, campaignId: string): string {
  return `impressions:${userId}:${campaignId}`
}

function serializeContext(context: unknown): string {
  if (typeof context === 'string') return context
  return JSON.stringify(context ?? {})
}

async function getReferrerUserId(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<string | null> {
  // Anonymous IDs may be linked to an auth account.
  const { data: identity } = await supabase
    .from('builder_identities')
    .select('auth_user_id')
    .eq('anonymous_user_id', userId)
    .maybeSingle()

  const targetUserId = identity?.auth_user_id ?? userId

  const { data: referral } = await supabase
    .from('referrals')
    .select('referred_by')
    .eq('user_id', targetUserId)
    .maybeSingle()

  return referral?.referred_by ?? null
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()

  try {
    const apiAuthResponse = await requireApiKey(req)
    if (apiAuthResponse) {
      return apiAuthResponse
    }

    const rawBody = await req.json()
    const parseResult = RequestSchema.safeParse(rawBody)
    if (!parseResult.success) {
      throw new ApiError(400, 'Invalid request body', 'INVALID_BODY')
    }

    const { userId, sessionId, campaignId, impressionToken, context, durationMs, fingerprint, source } = parseResult.data
    const isTrusted = isTrustedUserId(userId)
    const impressionSource = source ?? 'unknown'

    // Validate the signed impression token to ensure the ad was actually served.
    const tokenPayload = await verifyImpressionToken(impressionToken)
    if (!tokenPayload) {
      throw new ApiError(401, 'Invalid or expired impression token', 'INVALID_TOKEN')
    }
    if (tokenPayload.campaignId !== campaignId) {
      throw new ApiError(401, 'Impression token mismatch', 'TOKEN_MISMATCH')
    }
    if (tokenPayload.userId !== userId) {
      throw new ApiError(401, 'Impression token user mismatch', 'TOKEN_USER_MISMATCH')
    }
    if (tokenPayload.sessionId !== sessionId) {
      throw new ApiError(401, 'Impression token session mismatch', 'TOKEN_SESSION_MISMATCH')
    }
    // Defense in depth: a per-device key may only redeem tokens issued to its own
    // account, so one device can't claim another creator's impressions.
    const deviceUserId = await getRequestDeviceUserId(req)
    if (deviceUserId && tokenPayload.userId !== deviceUserId) {
      throw new ApiError(401, 'Impression token device mismatch', 'TOKEN_DEVICE_MISMATCH')
    }
    const sessionIdForRow = tokenPayload.sessionId || sessionId
    const auctionPriceCpm = tokenPayload.auctionPriceCpm || 0
    const bidType: 'cpm' | 'cpc' = tokenPayload.bidType === 'cpc' ? 'cpc' : 'cpm'
    if (await isNonceUsed(tokenPayload.nonce)) {
      return NextResponse.json(
        { error: 'Duplicate impression token', code: 'DUPLICATE_TOKEN' },
        { status: 429 }
      )
    }

    const clientIp = getClientIp(req)
    const userAgent = req.headers.get('user-agent')
    const serializedContext = serializeContext(context)
    const ctxHash = await contextHash(serializedContext)

    // Run rate-limit, fraud, and device fingerprint checks in parallel after
    // token verification.
    const [rateLimitResult, fraud, fingerprintResult] = await Promise.all([
      impressionsRateLimiter.check(getRateLimitKey(userId, campaignId)),
      evaluateFraud(supabase, {
        userId,
        campaignId,
        durationMs,
        clientIp,
        userAgent,
        contextHash: ctxHash,
      }),
      evaluateDeviceFingerprint(supabase, userId, fingerprint),
    ])

    // Temporal dwell sanity: a scripted caller that fetches a token and instantly
    // reports a long dwell is physically impossible — the token hasn't existed
    // that long. This forces faking a human dwell to cost real wall-clock time.
    const tokenAgeMs = Date.now() - tokenPayload.issuedAt
    const dwellImplausible = durationMs > tokenAgeMs + DWELL_GRACE_MS

    const combinedFraud: typeof fraud = {
      blocked: fraud.blocked || fingerprintResult.blocked || dwellImplausible,
      reasons: [
        ...fraud.reasons,
        ...fingerprintResult.reasons,
        ...(dwellImplausible ? ['dwell_exceeds_token_age'] : []),
      ],
      score: fraud.score + fingerprintResult.score + (dwellImplausible ? DWELL_BLOCK_SCORE : 0),
    }

    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.limit, rateLimitResult.resetAt)
    }

    // Update trust score atomically via DB function for every real device/user ID.
    const { data: trustData, error: trustError } = await supabase.rpc(
      'update_user_trust_atomic',
      {
        p_user_id: userId,
        p_flagged: combinedFraud.blocked && !isTrusted,
      }
    )
    if (trustError) throw trustError
    if (!trustData) {
      throw new ApiError(500, "We couldn't record this impression. Please try again.", 'TRUST_UPDATE_FAILED')
    }

    const [trustRow] = trustData as Array<{
      trust_score: number
      payout_hold: boolean
      impression_count: number
      flagged_count: number
    }>
    const trustScore = trustRow.trust_score
    const payoutHold = isTrusted ? false : trustRow.payout_hold
    const tokenNonce = tokenPayload.nonce

    // Fire non-blocking anomaly detection for operational alerting.
    detectImpressionAnomalies({
      userId,
      campaignId,
      clientIp,
      contextHash: ctxHash,
    }).catch(() => {})

    if (combinedFraud.blocked && !isTrusted) {
      await supabase.from('impressions').insert({
        user_id: userId,
        session_id: sessionIdForRow,
        campaign_id: campaignId,
        client_ip: clientIp,
        context: serializedContext,
        context_hash: ctxHash,
        duration_ms: durationMs,
        auction_price_cpm: auctionPriceCpm,
        bid_type: bidType,
        token_nonce: tokenNonce,
        currency: 'usd',
        source: impressionSource,
        validated: false,
        payout_cents: 0,
        fraud_flags: combinedFraud.reasons,
        fraud_score: combinedFraud.score,
        payout_hold: true,
      })
      return NextResponse.json(
        { ok: true, validated: false, payoutCents: 0, flagged: combinedFraud.reasons, trustScore },
        { status: 200 }
      )
    }

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      throw new ApiError(404, 'Campaign not found', 'CAMPAIGN_NOT_FOUND')
    }

    const budgetRemaining = campaign.spent_cents < campaign.budget_cents
    let validated = campaign.status === 'active' && budgetRemaining && !payoutHold
    // Earnings are tracked in millicents (1 cent = 1000) so the creator can earn an
    // exact 50% of the clearing price even when that is a fraction of a cent.
    let payoutMillicents = 0
    let referrerPayoutMillicents = 0
    let costMillicents = 0
    const fraudFlags = [...combinedFraud.reasons]

    // Frequency-cap enforcement at impression time (defense in depth).
    const frequencyCap = campaign.frequency_cap ?? 3
    const frequencyWindowHours = campaign.frequency_window_hours ?? 24
    const frequencyCount = await getUserCampaignFrequencyCount(
      supabase,
      userId,
      campaignId,
      frequencyWindowHours
    )
    if (frequencyCount >= frequencyCap) {
      validated = false
      fraudFlags.push('frequency_cap')
    }

    let referrerUserId: string | null = null

    if (validated && bidType === 'cpc') {
      // CPC: nothing is charged or earned at impression time. The advertiser pays
      // per click and the creator earns 50% of that click price (see /api/clicks).
      // Record the referrer now so the click can credit them.
      referrerUserId = await getReferrerUserId(supabase, userId)
    } else if (validated) {
      // The advertiser pays the full auction clearing price per impression
      // (auction_price_cpm is cents per 1000 impressions, so per impression it is
      // auction_price_cpm millicents). The creator earns exactly 50% of that, with
      // no minimum floor. Referrer earns 10% of the creator payout, from Prism's cut.
      costMillicents = auctionPriceCpm
      payoutMillicents = Math.round(auctionPriceCpm / 2)
      referrerUserId = await getReferrerUserId(supabase, userId)
      if (referrerUserId) {
        referrerPayoutMillicents = Math.max(0, Math.round(payoutMillicents * 0.1))
      }

      const today = new Date().toISOString().split('T')[0]
      const { data: dailyOk, error: dailyError } = await supabase.rpc(
        'increment_campaign_daily_spend_mc',
        {
          p_campaign_id: campaignId,
          p_spend_date: today,
          p_amount_mc: costMillicents,
          p_cap_mc: MAX_DAILY_SPEND_MILLICENTS,
        }
      )
      if (dailyError) throw dailyError

      if (!dailyOk) {
        validated = false
        payoutMillicents = 0
        referrerPayoutMillicents = 0
        costMillicents = 0
        referrerUserId = null
        fraudFlags.push('daily_spend_cap')
      }
    }

    if (!budgetRemaining) fraudFlags.push('budget_exhausted')
    if (payoutHold) fraudFlags.push('low_trust_score')

    const { data: insertedImpression, error: impressionError } = await supabase
      .from('impressions')
      .insert({
        user_id: userId,
        session_id: sessionIdForRow,
        campaign_id: campaignId,
        client_ip: clientIp,
        context: serializedContext,
        context_hash: ctxHash,
        duration_ms: durationMs,
        auction_price_cpm: auctionPriceCpm,
        bid_type: bidType,
        token_nonce: tokenNonce,
        currency: 'usd',
        source: impressionSource,
        creative_id: tokenPayload.creativeId ?? null,
        validated,
        payout_cents: Math.round(payoutMillicents / 1000),
        payout_millicents: payoutMillicents,
        referrer_user_id: referrerUserId,
        referrer_payout_cents: Math.round(referrerPayoutMillicents / 1000),
        referrer_payout_millicents: referrerPayoutMillicents,
        fraud_flags: fraudFlags,
        fraud_score: combinedFraud.score,
        payout_hold: payoutHold || !validated,
      })
      .select('id')
      .single()

    if (impressionError) throw impressionError

    if (validated && payoutMillicents > 0) {
      const { data: newSpent, error: updateError } = await supabase.rpc(
        'increment_campaign_spent_mc',
        { p_campaign_id: campaignId, p_amount_mc: costMillicents }
      )
      if (updateError) throw updateError

      if (newSpent === null) {
        await supabase
          .from('impressions')
          .update({
            validated: false,
            payout_cents: 0,
            payout_millicents: 0,
            referrer_payout_cents: 0,
            referrer_payout_millicents: 0,
            fraud_flags: [...fraudFlags, 'budget_exceeded'],
          })
          .eq('id', insertedImpression.id)
        return NextResponse.json(
          { ok: true, validated: false, payoutCents: 0, trustScore },
          { headers: corsHeaders() }
        )
      }

      // Count the billable impression toward its A/B creative variant.
      if (tokenPayload.creativeId) {
        supabase
          .rpc('bump_creative_counts', { p_creative_id: tokenPayload.creativeId, p_imp: 1 })
          .then(() => {}, () => {})
      }

      if (newSpent >= campaign.budget_cents) {
        sendCampaignBudgetExhaustedEmail(campaign.id).catch(() => {})
      }

      const advertiser = await getAdvertiserById(campaign.advertiser_id)
      if (advertiser) {
        maybeSendLowBalanceEmail(campaign.advertiser_id, advertiser.balance_cents).catch(() => {})
        // Pre-filter on a generous ceiling; maybeAutoRecharge does the precise
        // threshold + saved-card + throttle checks and charges off-session.
        if (advertiser.balance_cents < 50000) {
          maybeAutoRecharge(campaign.advertiser_id).catch(() => {})
        }
      }

      detectBudgetDrainAnomaly({
        id: campaign.id,
        title: campaign.title,
        budget_cents: campaign.budget_cents,
        spent_cents: newSpent,
      }).catch(() => {})
    }

    return NextResponse.json(
      { ok: true, validated, payoutCents: Math.round(payoutMillicents / 1000), trustScore },
      { headers: corsHeaders() }
    )
  } catch (err) {
    return handleApiError(err)
  }
}

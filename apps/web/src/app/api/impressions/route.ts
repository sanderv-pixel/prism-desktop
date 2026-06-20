import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/utils/supabase/admin'
import { RateLimiter, getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'
import { handleApiError, ApiError } from '@/lib/api/errors'
import { requireApiKey, getRequestDeviceUserId } from '@/lib/api/auth'
import {
  evaluateFraud,
  contextHash,
  evaluateDeviceFingerprint,
  getUserCampaignFrequencyCount,
} from '@/lib/api/fraud'
import { verifyImpressionToken, isNonceUsed } from '@/lib/api/tokens'
import { detectImpressionAnomalies, detectBudgetDrainAnomaly } from '@/lib/anomaly'
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
const MIN_TRUST_SCORE_FOR_PAYOUT = 20
const MIN_ATTENTION_MS = 800

// A reported dwell can't exceed how long the impression token has existed (both
// timestamps are server-side). The grace absorbs network latency on the report;
// legitimate clients always have token-age >= dwell, so this never trips them.
const DWELL_GRACE_MS = 2000
const DWELL_BLOCK_SCORE = 10

// Vetted accounts (e.g. the team's own devices) that bypass fraud blocking and
// payout holds, so legitimate high-volume usage isn't auto-frozen. Set the
// PRISM_TRUSTED_USER_IDS env var to a comma-separated list of auth user ids.
const TRUSTED_USER_IDS = new Set(
  (process.env.PRISM_TRUSTED_USER_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
)

const RequestSchema = z.object({
  userId: z.string().min(1).max(128),
  sessionId: z.string().min(1).max(128),
  campaignId: z.string().uuid(),
  impressionToken: z.string().min(1),
  context: z.union([z.string(), z.record(z.any())]).optional(),
  durationMs: z.number().int().min(MIN_ATTENTION_MS).max(600 * 1000),
  fingerprint: z.union([z.string(), z.record(z.any())]).optional(),
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

    const { userId, sessionId, campaignId, impressionToken, context, durationMs, fingerprint } = parseResult.data
    const isTrusted = TRUSTED_USER_IDS.has(userId)

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
        token_nonce: tokenNonce,
        currency: 'usd',
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
    let payoutCents = 0
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
      payoutCents = 0
      fraudFlags.push('frequency_cap')
    }

    let referrerUserId: string | null = null
    let referrerPayoutCents = 0

    if (validated) {
      const clearingPricePerImp = Math.max(1, Math.round(auctionPriceCpm / 1000))
      // Creator earns 50% of the auction clearing price.
      payoutCents = Math.max(1, Math.round(clearingPricePerImp * 0.5))
      // Referrer earns 10% of the creator's payout (additive, from Prism's share).
      referrerUserId = await getReferrerUserId(supabase, userId)
      if (referrerUserId) {
        referrerPayoutCents = Math.max(0, Math.round(payoutCents * 0.1))
      }

      const totalCostCents = payoutCents + referrerPayoutCents
      const today = new Date().toISOString().split('T')[0]
      const { data: dailyOk, error: dailyError } = await supabase.rpc(
        'increment_campaign_daily_spend',
        {
          p_campaign_id: campaignId,
          p_spend_date: today,
          p_amount: totalCostCents,
          p_cap: MAX_DAILY_SPEND_CENTS,
        }
      )
      if (dailyError) throw dailyError

      if (!dailyOk) {
        validated = false
        payoutCents = 0
        referrerPayoutCents = 0
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
        token_nonce: tokenNonce,
        currency: 'usd',
        validated,
        payout_cents: payoutCents,
        referrer_user_id: referrerUserId,
        referrer_payout_cents: referrerPayoutCents,
        fraud_flags: fraudFlags,
        fraud_score: combinedFraud.score,
        payout_hold: payoutHold || !validated,
      })
      .select('id')
      .single()

    if (impressionError) throw impressionError

    if (validated && payoutCents > 0) {
      const totalCostCents = payoutCents + referrerPayoutCents
      const { data: newSpent, error: updateError } = await supabase.rpc(
        'increment_campaign_spent',
        { p_campaign_id: campaignId, p_amount: totalCostCents }
      )
      if (updateError) throw updateError

      if (newSpent === null) {
        await supabase
          .from('impressions')
          .update({
            validated: false,
            payout_cents: 0,
            referrer_payout_cents: 0,
            fraud_flags: [...fraudFlags, 'budget_exceeded'],
          })
          .eq('id', insertedImpression.id)
        return NextResponse.json(
          { ok: true, validated: false, payoutCents: 0, trustScore },
          { headers: corsHeaders() }
        )
      }

      if (newSpent >= campaign.budget_cents) {
        sendCampaignBudgetExhaustedEmail(campaign.id).catch(() => {})
      }

      const advertiser = await getAdvertiserById(campaign.advertiser_id)
      if (advertiser) {
        maybeSendLowBalanceEmail(campaign.advertiser_id, advertiser.balance_cents).catch(() => {})
      }

      detectBudgetDrainAnomaly({
        id: campaign.id,
        title: campaign.title,
        budget_cents: campaign.budget_cents,
        spent_cents: newSpent,
      }).catch(() => {})
    }

    return NextResponse.json(
      { ok: true, validated, payoutCents, trustScore },
      { headers: corsHeaders() }
    )
  } catch (err) {
    return handleApiError(err)
  }
}

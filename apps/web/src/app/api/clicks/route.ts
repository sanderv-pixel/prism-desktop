import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { verifyImpressionToken } from '@/lib/api/tokens'
import { evaluateClickFraud } from '@/lib/api/fraud'
import {
  RateLimiter,
  getClientIp,
  checkRateLimit,
  rateLimitResponse,
} from '@/lib/api/rate-limit'
import { handleApiError, ApiError } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'

const clicksRateLimiter = new RateLimiter(60, 60 * 1000)

export async function GET(req: NextRequest) {
  const supabase = createAdminClient()

  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('t')
    if (!token) {
      throw new ApiError(400, 'Missing click token', 'MISSING_TOKEN')
    }

    const payload = await verifyImpressionToken(token)
    if (!payload) {
      throw new ApiError(401, 'Invalid or expired click token', 'INVALID_TOKEN')
    }

    const { campaignId, userId, sessionId, nonce } = payload
    const clientIp = getClientIp(req)

    const rateLimitKey = `clicks:${sessionId}:${clientIp}`
    const rateLimited = await checkRateLimit(clicksRateLimiter, rateLimitKey)
    if (rateLimited) return rateLimited

    const userAgent = req.headers.get('user-agent')
    const fraud = await evaluateClickFraud(supabase, {
      userId,
      campaignId,
      sessionId,
      clientIp,
      userAgent,
    })
    if (fraud.blocked) {
      // Still redirect the user so the ad experience is not broken, but log the
      // fraud signals for analysis without counting it as a real click.
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('url')
        .eq('id', campaignId)
        .single()

      try {
        await supabase.from('clicks').insert({
          campaign_id: campaignId,
          user_id: userId,
          session_id: sessionId,
          url: campaign?.url || '',
          redirected: true,
          client_ip: clientIp,
          fraud_flags: fraud.reasons,
        })
      } catch {
        // Best-effort logging; never break the redirect.
      }

      return NextResponse.redirect(campaign?.url || '/', 302)
    }

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, url, advertiser_id')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      throw new ApiError(404, 'Campaign not found', 'CAMPAIGN_NOT_FOUND')
    }

    // Idempotent click recording keyed by the impression token nonce.
    const { error: clickError } = await supabase.from('clicks').insert({
      campaign_id: campaignId,
      user_id: userId,
      session_id: sessionId,
      token_nonce: nonce,
      context: req.headers.get('referer') ?? '',
      url: campaign.url,
      redirected: true,
    })

    if (clickError) {
      // Duplicate nonce -> this token was already clicked. Still redirect the user.
      if (clickError.code === '23505') {
        return NextResponse.redirect(campaign.url, 302)
      }
      console.error('Click tracking error:', clickError)
    } else {
      // Best-effort increment on successful first insert.
      try {
        await supabase.rpc('increment_campaign_click_count', { p_campaign_id: campaignId })
      } catch {
        // ignore
      }
    }

    return NextResponse.redirect(campaign.url, 302)
  } catch (err) {
    return handleApiError(err)
  }
}

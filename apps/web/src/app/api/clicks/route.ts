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

    const { campaignId, userId, sessionId, nonce, creativeId } = payload
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

    // A/B: redirect to the served creative's URL (variants can differ) and count
    // the click toward that variant. Fall back to the campaign URL.
    let destUrl = campaign.url
    if (creativeId) {
      const { data: cr } = await supabase
        .from('campaign_creatives')
        .select('url')
        .eq('id', creativeId)
        .single()
      if (cr?.url) destUrl = cr.url
    }

    // Idempotent click recording keyed by the impression token nonce.
    const { data: clickRow, error: clickError } = await supabase
      .from('clicks')
      .insert({
        campaign_id: campaignId,
        user_id: userId,
        session_id: sessionId,
        token_nonce: nonce,
        context: req.headers.get('referer') ?? '',
        url: destUrl,
        redirected: true,
        creative_id: creativeId ?? null,
      })
      .select('id')
      .single()

    if (clickError) {
      // Duplicate nonce -> this token was already clicked. Still redirect the user.
      if (clickError.code === '23505') {
        return NextResponse.redirect(destUrl, 302)
      }
      console.error('Click tracking error:', clickError)
    } else {
      // Best-effort increments on successful first insert.
      try {
        await supabase.rpc('increment_campaign_click_count', { p_campaign_id: campaignId })
        if (creativeId) {
          await supabase.rpc('bump_creative_counts', { p_creative_id: creativeId, p_clk: 1 })
        }
      } catch {
        // ignore
      }
    }

    // Pass the click id to the advertiser's landing page so they can attribute a
    // later conversion back to it via the /api/conversions/track postback.
    if (clickRow?.id) {
      try {
        const u = new URL(destUrl)
        u.searchParams.set('prism_click_id', clickRow.id)
        destUrl = u.toString()
      } catch {
        // non-absolute URL; leave as-is
      }
    }

    return NextResponse.redirect(destUrl, 302)
  } catch (err) {
    return handleApiError(err)
  }
}

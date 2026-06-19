import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireApiKey } from '@/lib/api/auth'
import { verifyConversionToken, isConversionNonceUsed } from '@/lib/api/tokens'
import { evaluateConversionFraud } from '@/lib/api/fraud'
import {
  RateLimiter,
  getClientIp,
  checkRateLimit,
  rateLimitResponse,
} from '@/lib/api/rate-limit'
import { handleApiError, ApiError, formatZodError } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'

const conversionsRateLimiter = new RateLimiter(60, 60 * 1000)
const MAX_VALUE_CENTS = 10_000_000 // $100,000 per conversion
const ATTRIBUTION_WINDOW_HOURS = 30 * 24 // 30 days

const ConversionSchema = z.object({
  conversionToken: z.string().min(1).optional(),
  clickId: z.string().uuid().optional(),
  eventName: z.string().min(1).max(128),
  valueCents: z.number().int().min(0).max(MAX_VALUE_CENTS).default(0),
  currency: z.string().min(3).max(3).default('usd'),
})

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()

  try {
    const apiAuthResponse = await requireApiKey(req)
    if (apiAuthResponse) {
      return apiAuthResponse
    }

    const rawBody = await req.json()
    const parseResult = ConversionSchema.safeParse(rawBody)
    if (!parseResult.success) {
      const { message, details } = formatZodError(parseResult.error)
      throw new ApiError(400, message, 'INVALID_BODY', details)
    }

    const { conversionToken, clickId, eventName, valueCents, currency } = parseResult.data

    if (!conversionToken && !clickId) {
      throw new ApiError(
        400,
        'Either conversionToken or clickId is required',
        'MISSING_IDENTIFIER'
      )
    }

    let resolvedCampaignId: string | null = null
    let resolvedSessionId: string | null = null
    let resolvedClickId: string | null = clickId ?? null

    if (conversionToken) {
      const payload = await verifyConversionToken(conversionToken)
      if (!payload) {
        throw new ApiError(401, 'Invalid or expired conversion token', 'INVALID_TOKEN')
      }
      if (await isConversionNonceUsed(payload.nonce)) {
        throw new ApiError(429, 'Conversion token already used', 'DUPLICATE_CONVERSION_TOKEN')
      }
      resolvedCampaignId = payload.campaignId
      resolvedSessionId = payload.sessionId
    }

    if (clickId) {
      const since = new Date(
        Date.now() - ATTRIBUTION_WINDOW_HOURS * 60 * 60 * 1000
      ).toISOString()
      const { data: click, error: clickError } = await supabase
        .from('clicks')
        .select('campaign_id, session_id, created_at')
        .eq('id', clickId)
        .gte('created_at', since)
        .single()

      if (clickError || !click) {
        throw new ApiError(404, 'Click not found or outside attribution window', 'CLICK_NOT_FOUND')
      }

      if (resolvedCampaignId && resolvedCampaignId !== click.campaign_id) {
        throw new ApiError(401, 'Conversion token does not match click', 'TOKEN_CLICK_MISMATCH')
      }
      resolvedCampaignId = click.campaign_id
      resolvedSessionId = click.session_id
    }

    if (!resolvedCampaignId) {
      throw new ApiError(400, 'Could not attribute conversion to a campaign', 'UNATTRIBUTED')
    }

    const clientIp = getClientIp(req)
    const userAgent = req.headers.get('user-agent')

    const rateLimitKey = `conversions:${resolvedCampaignId}:${clientIp}`
    const rateLimited = await checkRateLimit(conversionsRateLimiter, rateLimitKey)
    if (rateLimited) return rateLimited

    const fraud = await evaluateConversionFraud(supabase, {
      campaignId: resolvedCampaignId,
      clientIp,
      userAgent,
      valueCents,
    })
    if (fraud.blocked) {
      return NextResponse.json(
        { error: 'Conversion flagged as fraudulent', code: 'CONVERSION_FLAGGED', reasons: fraud.reasons },
        { status: 429 }
      )
    }

    const { error } = await supabase.from('conversions').insert({
      click_id: resolvedClickId,
      campaign_id: resolvedCampaignId,
      session_id: resolvedSessionId,
      event_name: eventName,
      value_cents: valueCents,
      currency,
    })

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleApiError(err)
  }
}

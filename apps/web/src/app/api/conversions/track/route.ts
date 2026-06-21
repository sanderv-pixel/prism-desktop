import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/utils/supabase/admin'
import { RateLimiter, getClientIp, checkRateLimit } from '@/lib/api/rate-limit'
import { handleApiError, ApiError } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'

const limiter = new RateLimiter(120, 60 * 1000)
const ATTRIBUTION_WINDOW_HOURS = 30 * 24
const MAX_VALUE_CENTS = 10_000_000

const Schema = z.object({
  clickId: z.string().uuid(),
  eventName: z.string().min(1).max(128),
  valueCents: z.number().int().min(0).max(MAX_VALUE_CENTS).default(0),
  currency: z.string().min(3).max(3).default('usd'),
})

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Prism-Advertiser-Key',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

// Server-to-server conversion postback, authenticated by the advertiser's
// conversion key. Records a conversion attributed to a click on one of the
// advertiser's own campaigns (so an advertiser can only credit their own traffic).
export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  try {
    const key = req.headers.get('x-prism-advertiser-key') ?? ''
    if (!key.startsWith('pck_')) {
      throw new ApiError(401, 'Missing or invalid advertiser key', 'UNAUTHORIZED')
    }
    const { data: advertiser } = await supabase
      .from('advertisers')
      .select('id')
      .eq('conversion_api_key', key)
      .maybeSingle()
    if (!advertiser) {
      throw new ApiError(401, 'Missing or invalid advertiser key', 'UNAUTHORIZED')
    }

    const rl = await checkRateLimit(limiter, `conv-track:${advertiser.id}:${getClientIp(req)}`)
    if (rl) return rl

    const parsed = Schema.safeParse(await req.json())
    if (!parsed.success) throw new ApiError(400, 'Invalid conversion payload', 'INVALID_BODY')
    const { clickId, eventName, valueCents, currency } = parsed.data

    const since = new Date(Date.now() - ATTRIBUTION_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
    const { data: click } = await supabase
      .from('clicks')
      .select('id, campaign_id, session_id, created_at')
      .eq('id', clickId)
      .gte('created_at', since)
      .maybeSingle()
    if (!click) {
      throw new ApiError(404, 'Click not found or outside the 30-day attribution window', 'CLICK_NOT_FOUND')
    }

    // Ownership: the click's campaign must belong to this advertiser.
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', click.campaign_id)
      .eq('advertiser_id', advertiser.id)
      .maybeSingle()
    if (!campaign) {
      throw new ApiError(403, 'Click does not belong to your account', 'FORBIDDEN')
    }

    const { error } = await supabase.from('conversions').insert({
      click_id: click.id,
      campaign_id: click.campaign_id,
      session_id: click.session_id,
      event_name: eventName,
      value_cents: valueCents,
      currency,
    })
    if (error) throw error

    return NextResponse.json({ ok: true }, { headers: corsHeaders() })
  } catch (err) {
    return handleApiError(err)
  }
}

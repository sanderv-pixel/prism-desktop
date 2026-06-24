import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireApiKey, getRequestDeviceUserId } from '@/lib/api/auth'
import { handleApiError, ApiError, formatZodError } from '@/lib/api/errors'

// Feedback from the expanded ad panel controls. Privacy: the body carries ONLY a
// campaign id + a signal, never any user content. `hidden`/`down` suppress that
// advertiser in future /api/ads auctions; `up`/`fewer` are stored for ranking.
export const dynamic = 'force-dynamic'

const FeedbackSchema = z.object({
  campaignId: z.string().uuid(),
  signal: z.enum(['up', 'down', 'fewer', 'hidden']),
})

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

export async function POST(req: NextRequest) {
  try {
    const authResponse = await requireApiKey(req)
    if (authResponse) return authResponse

    const userId = await getRequestDeviceUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'No earner account for this key' }, { status: 404, headers: corsHeaders() })
    }

    const parsed = FeedbackSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) {
      const { message, details } = formatZodError(parsed.error)
      throw new ApiError(400, message, 'INVALID_BODY', details)
    }
    const { campaignId, signal } = parsed.data

    const admin = createAdminClient()
    // Resolve the advertiser so eligibility can suppress by advertiser, not just campaign.
    const { data: campaign } = await admin
      .from('campaigns')
      .select('advertiser_id')
      .eq('id', campaignId)
      .maybeSingle()

    // Cast: overlay_ad_feedback is newer than the generated Supabase types.
    await (admin as any).from('overlay_ad_feedback').insert({
      user_id: userId,
      campaign_id: campaignId,
      advertiser_id: (campaign as { advertiser_id?: string } | null)?.advertiser_id ?? null,
      signal,
    })

    return NextResponse.json({ ok: true }, { headers: corsHeaders() })
  } catch (err) {
    return handleApiError(err)
  }
}

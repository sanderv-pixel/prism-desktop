import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireAdminAuth, adminRateLimiter } from '@/lib/admin'
import { getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'
import { handleApiError, ApiError } from '@/lib/api/errors'
import { logAudit } from '@/lib/audit'
import { sendCampaignApprovedEmail, sendCampaignRejectedEmail } from '@/lib/email/helpers'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const auth = await requireAdminAuth(req, user)
    if (auth.response) return auth.response

    const rateLimitResult = await adminRateLimiter.check(getClientIp(req))
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.limit, rateLimitResult.resetAt)
    }

    const { action = 'approve' } = await req.json().catch(() => ({}))
    const newStatus = action === 'reject' ? 'rejected' : 'active'

    // Admin updates bypass RLS so any pending campaign can be reviewed.
    const adminClient = createAdminClient()
    const { data: campaign, error } = await adminClient
      .from('campaigns')
      .update({
        status: newStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: auth.user.id,
      })
      .eq('id', params.id)
      .eq('status', 'pending_review')
      .select()
      .single()

    if (error) throw error
    if (!campaign) {
      throw new ApiError(
        404,
        'This campaign is not pending review. It may have already been approved or rejected.',
        'NOT_FOUND'
      )
    }

    await logAudit({
      actorId: auth.user.id,
      actorEmail: auth.user.email ?? undefined,
      action: action === 'reject' ? 'admin.campaign.reject' : 'admin.campaign.approve',
      targetType: 'campaign',
      targetId: campaign.id,
      metadata: {
        newStatus,
        title: campaign.title,
        advertiserId: campaign.advertiser_id,
      },
      ipAddress: getClientIp(req),
    })

    if (action === 'reject') {
      sendCampaignRejectedEmail(campaign.id).catch(() => {})
    } else {
      sendCampaignApprovedEmail(campaign.id).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      message:
        action === 'reject'
          ? 'Campaign rejected.'
          : 'Campaign approved and is now active.',
      campaign,
    })
  } catch (err) {
    return handleApiError(err)
  }
}


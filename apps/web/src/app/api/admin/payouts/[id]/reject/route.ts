import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireAdminAuth, adminRateLimiter } from '@/lib/admin'
import { getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'
import { handleApiError, ApiError, formatZodError } from '@/lib/api/errors'
import { logAudit } from '@/lib/audit'
import { sendPayoutRejectedEmail } from '@/lib/email/helpers'

export const dynamic = 'force-dynamic'

const RejectSchema = z.object({
  reason: z.string().min(1).max(500),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const auth = await requireAdminAuth(req, user)
    if (auth.response) return auth.response

    const rateLimitResult = await adminRateLimiter.check(getClientIp(req))
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.limit, rateLimitResult.resetAt)
    }

    const payoutId = params.id
    if (!payoutId) {
      throw new ApiError(400, 'Missing payout ID', 'MISSING_PAYOUT_ID')
    }

    const parseResult = RejectSchema.safeParse(await req.json())
    if (!parseResult.success) {
      const { message, details } = formatZodError(parseResult.error)
      throw new ApiError(400, message, 'INVALID_BODY', details)
    }

    const { reason } = parseResult.data

    const { data: payout, error: payoutError } = await adminClient
      .from('payouts')
      .select('*')
      .eq('id', payoutId)
      .maybeSingle()

    if (payoutError) throw payoutError
    if (!payout) {
      throw new ApiError(404, "We couldn't find that payout.", 'PAYOUT_NOT_FOUND')
    }

    if (payout.status !== 'pending_review') {
      throw new ApiError(
        409,
        `This payout has already been processed (status: ${payout.status}).`,
        'PAYOUT_NOT_REVIEWABLE'
      )
    }

    const { error: updateError } = await adminClient
      .from('payouts')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        reviewed_at: new Date().toISOString(),
        reviewed_by: auth.user.id,
      })
      .eq('id', payoutId)

    if (updateError) throw updateError

    await logAudit({
      actorId: auth.user.id,
      actorEmail: auth.user.email ?? undefined,
      action: 'payout.reject',
      targetType: 'payout',
      targetId: payout.id,
      metadata: {
        amountCents: payout.amount_cents,
        reason,
      },
      ipAddress: getClientIp(req),
    })

    sendPayoutRejectedEmail(payout.user_id, payout.amount_cents, reason).catch(() => {})

    return NextResponse.json({ success: true, message: 'Payout rejected.' })
  } catch (err) {
    return handleApiError(err)
  }
}

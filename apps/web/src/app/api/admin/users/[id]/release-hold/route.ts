import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { requireAdminAuth, adminRateLimiter } from '@/lib/admin'
import { getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'
import { setUserPayoutHold } from '@/lib/anomaly'
import { logAudit } from '@/lib/audit'
import { handleApiError, ApiError } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const auth = await requireAdminAuth(req, user)
    if (auth.response) return auth.response

    const rateLimitResult = await adminRateLimiter.check(getClientIp(req))
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.limit, rateLimitResult.resetAt)
    }

    const userId = params.id
    if (!userId) {
      throw new ApiError(400, 'Missing user ID', 'MISSING_USER_ID')
    }

    const body = await req.json().catch(() => ({}))
    const hold = Boolean(body.hold)

    await setUserPayoutHold(userId, hold)

    await logAudit({
      actorId: auth.user.id,
      actorEmail: auth.user.email ?? undefined,
      action: hold ? 'admin.user.set_hold' : 'admin.user.release_hold',
      targetType: 'user',
      targetId: userId,
      metadata: { hold },
      ipAddress: getClientIp(req),
    })

    return NextResponse.json({
      success: true,
      hold,
      message: hold
        ? 'Payout hold enabled for this user.'
        : 'Payout hold released for this user.',
    })
  } catch (err) {
    return handleApiError(err)
  }
}

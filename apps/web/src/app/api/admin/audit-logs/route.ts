import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireAdminAuth, adminRateLimiter } from '@/lib/admin'
import { getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'
import { handleApiError } from '@/lib/api/errors'
import { fetchAuditLogs } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const auth = await requireAdminAuth(req, user)
    if (auth.response) return auth.response

    const rateLimitResult = await adminRateLimiter.check(getClientIp(req))
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.limit, rateLimitResult.resetAt)
    }

    const { searchParams } = req.nextUrl
    const action = searchParams.get('action') ?? undefined
    const targetType = searchParams.get('targetType') ?? undefined
    const targetId = searchParams.get('targetId') ?? undefined
    const actorId = searchParams.get('actorId') ?? undefined
    const limit = Math.min(250, Math.max(1, Number(searchParams.get('limit') ?? '100')))
    const offset = Math.max(0, Number(searchParams.get('offset') ?? '0'))

    const adminClient = createAdminClient()
    const logs = await fetchAuditLogs(adminClient, {
      action: action as any,
      targetType,
      targetId,
      actorId,
      limit,
      offset,
    })

    return NextResponse.json(logs)
  } catch (err) {
    return handleApiError(err)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireAdminAuth, adminRateLimiter } from '@/lib/admin'
import { getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'
import { handleApiError, ApiError, formatZodError } from '@/lib/api/errors'
import { fetchAnomalies, acknowledgeAnomaly } from '@/lib/anomaly'
import { z } from 'zod'

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
    const acknowledgedParam = searchParams.get('acknowledged')
    const acknowledged =
      acknowledgedParam === 'true'
        ? true
        : acknowledgedParam === 'false'
          ? false
          : undefined
    const type = searchParams.get('type') ?? undefined
    const severity = searchParams.get('severity') ?? undefined
    const limit = Math.min(250, Math.max(1, Number(searchParams.get('limit') ?? '100')))
    const offset = Math.max(0, Number(searchParams.get('offset') ?? '0'))

    const adminClient = createAdminClient()
    const anomalies = await fetchAnomalies(adminClient, {
      acknowledged,
      type: type as any,
      severity: severity as any,
      limit,
      offset,
    })

    return NextResponse.json(anomalies)
  } catch (err) {
    return handleApiError(err)
  }
}

const AcknowledgeSchema = z.object({
  anomalyId: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const auth = await requireAdminAuth(req, user)
    if (auth.response) return auth.response

    const rateLimitResult = await adminRateLimiter.check(getClientIp(req))
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.limit, rateLimitResult.resetAt)
    }

    const parseResult = AcknowledgeSchema.safeParse(await req.json())
    if (!parseResult.success) {
      const { message, details } = formatZodError(parseResult.error)
      throw new ApiError(400, message, 'INVALID_BODY', details)
    }

    const adminClient = createAdminClient()
    await acknowledgeAnomaly(adminClient, parseResult.data.anomalyId, auth.user.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err)
  }
}

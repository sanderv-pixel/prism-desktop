import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { requireAdminAuth, adminRateLimiter } from '@/lib/admin'
import { getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'
import { handleApiError } from '@/lib/api/errors'
import { fetchGaAnalytics, isGoogleAnalyticsConfigured } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()

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

    if (!isGoogleAnalyticsConfigured()) {
      return NextResponse.json(
        { error: 'Google Analytics is not configured' },
        { status: 503 }
      )
    }

    const days = Math.min(90, Math.max(7, Number(req.nextUrl.searchParams.get('days') ?? '30')))
    const data = await fetchGaAnalytics(days)

    return NextResponse.json({ data })
  } catch (err) {
    return handleApiError(err)
  }
}

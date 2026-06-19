import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generateDeviceApiKey, registerDeviceCredential } from '@/lib/api/device-keys'
import { RateLimiter, getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'
import { handleApiError } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'

const rateLimiter = new RateLimiter(5, 60 * 60 * 1000)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const clientIp = getClientIp(req)
    const rateLimitResult = await rateLimiter.check(`device-key:${user.id}`)
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.limit, rateLimitResult.resetAt)
    }

    const apiKey = generateDeviceApiKey()
    await registerDeviceCredential({
      anonymousUserId: user.id,
      apiKey,
      fingerprint: { source: 'web-dashboard' },
      ip: clientIp,
    })

    return NextResponse.json({ apiKey })
  } catch (err) {
    return handleApiError(err)
  }
}

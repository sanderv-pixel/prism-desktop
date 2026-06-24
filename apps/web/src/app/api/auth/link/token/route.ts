import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient } from '@/utils/supabase/server'
import { kvSet } from '@/lib/redis'
import { RateLimiter, getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'
import { handleApiError, ApiError } from '@/lib/api/errors'
import { LINK_TOKEN_PREFIX, LINK_TTL_SECONDS } from '@/lib/api/link-tokens'

// Mints a one-time link token bound to the signed-in account. The dashboard embeds
// it in the personalized install command (PRISM_LINK_TOKEN=…); install.sh later
// exchanges it via /api/auth/link/exchange for an account-bound device key, so the
// overlay credits earnings to this account from the first impression — no browser
// round-trip and no native app changes (install.sh seeds the key into the overlay's
// prefs before first launch).
export const dynamic = 'force-dynamic'

const mintLimiter = new RateLimiter(10, 60 * 60 * 1000)

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      throw new ApiError(401, 'Sign in required', 'UNAUTHORIZED')
    }

    const rate = await mintLimiter.check(`link-token:${user.id}:${getClientIp(req)}`)
    if (!rate.success) return rateLimitResponse(rate.limit, rate.resetAt)

    const token = randomBytes(32).toString('hex')
    await kvSet(LINK_TOKEN_PREFIX + token, user.id, { ex: LINK_TTL_SECONDS })

    return NextResponse.json({ token, expiresInSeconds: LINK_TTL_SECONDS })
  } catch (err) {
    return handleApiError(err)
  }
}

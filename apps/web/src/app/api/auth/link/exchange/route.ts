import { NextRequest, NextResponse } from 'next/server'
import { kvGet, kvDel } from '@/lib/redis'
import { generateDeviceApiKey, registerDeviceCredential } from '@/lib/api/device-keys'
import { RateLimiter, getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'
import { handleApiError, ApiError } from '@/lib/api/errors'
import { LINK_TOKEN_PREFIX } from '@/lib/api/link-tokens'

// Exchanges a one-time link token (minted by /api/auth/link/token for a signed-in
// account) for an account-bound device key. Called by install.sh from the terminal,
// so the high-entropy one-time token is the only secret needed (no browser session).
// The minted credential is bound to the account (anonymous_user_id = user.id) and
// marked verified, so impressions credit the account immediately.
export const dynamic = 'force-dynamic'

const exchangeLimiter = new RateLimiter(30, 60 * 60 * 1000)

function isValidToken(t: unknown): t is string {
  return typeof t === 'string' && /^[a-f0-9]{64}$/.test(t)
}

async function readToken(req: NextRequest): Promise<string | null> {
  const raw = await req.text()
  if (!raw) return null
  // install.sh sends JSON; also accept form-encoded for plain `curl -d`.
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.token === 'string') return parsed.token
  } catch {
    const params = new URLSearchParams(raw)
    const t = params.get('token')
    if (t) return t
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const rate = await exchangeLimiter.check(`link-exchange:${getClientIp(req)}`)
    if (!rate.success) return rateLimitResponse(rate.limit, rate.resetAt)

    const token = await readToken(req)
    if (!isValidToken(token)) {
      throw new ApiError(400, 'Invalid link token', 'INVALID_TOKEN')
    }

    const userId = await kvGet(LINK_TOKEN_PREFIX + token)
    if (!userId || typeof userId !== 'string') {
      throw new ApiError(400, 'Link token expired or already used', 'TOKEN_INVALID')
    }
    await kvDel(LINK_TOKEN_PREFIX + token) // one-time use

    const apiKey = generateDeviceApiKey()
    await registerDeviceCredential({
      anonymousUserId: userId,
      apiKey,
      ip: getClientIp(req),
      verified: true,
    })

    return NextResponse.json({ apiKey })
  } catch (err) {
    return handleApiError(err)
  }
}

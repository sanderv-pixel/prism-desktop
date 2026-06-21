import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generateDeviceApiKey, registerDeviceCredential } from '@/lib/api/device-keys'
import { kvGet, kvSet, kvDel } from '@/lib/redis'
import { RateLimiter, getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'
import { handleApiError, ApiError } from '@/lib/api/errors'

// Device-pairing flow (like `gh auth login`): a desktop app generates a random
// code, opens /link?code=… in the browser, the signed-in user mints a device
// key for that code (POST), and the app polls GET until the key is ready.
export const dynamic = 'force-dynamic'

const PAIR_PREFIX = 'prism:pair:'
const PAIR_TTL_SECONDS = 600 // 10 minutes to complete sign-in

const pollLimiter = new RateLimiter(120, 60 * 1000)
const mintLimiter = new RateLimiter(10, 60 * 60 * 1000)

function isValidCode(code: string | null): code is string {
  return !!code && /^[a-f0-9]{16,128}$/.test(code)
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

// Polled by the desktop app (no auth — the high-entropy code is the secret).
// Returns the minted key once, then deletes it.
export async function GET(req: NextRequest) {
  try {
    const code = new URL(req.url).searchParams.get('code')
    if (!isValidCode(code)) {
      throw new ApiError(400, 'Invalid pairing code', 'INVALID_CODE')
    }
    const rate = await pollLimiter.check(`pair-poll:${getClientIp(req)}`)
    if (!rate.success) return rateLimitResponse(rate.limit, rate.resetAt)

    const key = await kvGet(PAIR_PREFIX + code)
    if (!key) {
      // Not authorized yet — tell the app to keep polling.
      return new NextResponse(null, { status: 204, headers: corsHeaders() })
    }
    await kvDel(PAIR_PREFIX + code) // one-time use
    return NextResponse.json({ apiKey: key }, { headers: corsHeaders() })
  } catch (err) {
    return handleApiError(err)
  }
}

// Called by the /link page once the user is signed in. Mints a device key bound
// to their account and stashes it under the pairing code for the app to fetch.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      throw new ApiError(401, 'Sign in required', 'UNAUTHORIZED')
    }

    const { code } = await req.json().catch(() => ({}))
    if (!isValidCode(code)) {
      throw new ApiError(400, 'Invalid pairing code', 'INVALID_CODE')
    }

    const rate = await mintLimiter.check(`pair-mint:${user.id}`)
    if (!rate.success) return rateLimitResponse(rate.limit, rate.resetAt)

    const apiKey = generateDeviceApiKey()
    // Don't store a placeholder fingerprint here — the browser pairing call can't
    // see the overlay's device. The credential's fingerprint is established by
    // trust-on-first-use from the first impression the overlay reports.
    await registerDeviceCredential({
      anonymousUserId: user.id,
      apiKey,
      ip: getClientIp(req),
    })
    await kvSet(PAIR_PREFIX + code, apiKey, { ex: PAIR_TTL_SECONDS })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleApiError(err)
  }
}

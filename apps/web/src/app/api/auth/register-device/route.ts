import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { requireApiKey } from '@/lib/api/auth'
import {
  RateLimiter,
  getClientIp,
  rateLimitResponse,
} from '@/lib/api/rate-limit'
import { handleApiError, ApiError, formatZodError } from '@/lib/api/errors'
import {
  generateDeviceApiKey,
  registerDeviceCredential,
  countAccountDeviceCredentials,
} from '@/lib/api/device-keys'
import { verifyTurnstile } from '@/lib/api/turnstile'
import { isDevicePohEnforced, maxDevicesPerAccount } from '@/lib/env'

export const dynamic = 'force-dynamic'

const registerRateLimiter = new RateLimiter(10, 60 * 60 * 1000)
// Daily per-IP cap on top of the existing 10/hr, to slow bulk Sybil minting.
const registerDailyRateLimiter = new RateLimiter(50, 24 * 60 * 60 * 1000)

const RegisterSchema = z.object({
  anonymousUserId: z.string().min(1).max(128),
  fingerprint: z.union([z.string(), z.record(z.any())]).optional(),
  turnstileToken: z.string().max(4096).optional(),
})

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()

  try {
    const apiAuthResponse = await requireApiKey(req, {
      allowGlobalInProduction: true,
    })
    if (apiAuthResponse) {
      return apiAuthResponse
    }

    const clientIp = getClientIp(req)
    const rateLimitResult = await registerRateLimiter.check(
      `register-device:${clientIp}`
    )
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.limit, rateLimitResult.resetAt)
    }
    const dailyResult = await registerDailyRateLimiter.check(
      `register-device-daily:${clientIp}`
    )
    if (!dailyResult.success) {
      return rateLimitResponse(dailyResult.limit, dailyResult.resetAt)
    }

    const parseResult = RegisterSchema.safeParse(await req.json())
    if (!parseResult.success) {
      const { message, details } = formatZodError(parseResult.error)
      throw new ApiError(400, message, 'INVALID_BODY', details)
    }

    const { anonymousUserId, fingerprint, turnstileToken } = parseResult.data

    // Proof of humanity: a signed-in account (already human-verified) or a valid
    // Turnstile token. Computed regardless of the flag so we always TAG verified vs
    // unverified; enforcement (reject + per-account cap) only applies when the flag
    // is on, keeping anonymous minting working until then.
    const authClient = await createClient()
    const {
      data: { user: sessionUser },
    } = await authClient.auth.getUser()
    let verified = false
    if (sessionUser) {
      verified = true
    } else if (turnstileToken && (await verifyTurnstile(turnstileToken))) {
      verified = true
    }

    if (isDevicePohEnforced()) {
      if (!verified) {
        throw new ApiError(
          403,
          'Proof of humanity required to register an earning device. Sign in or complete the CAPTCHA.',
          'PROOF_REQUIRED'
        )
      }
      if (sessionUser) {
        const existing = await countAccountDeviceCredentials(sessionUser.id)
        if (existing >= maxDevicesPerAccount()) {
          throw new ApiError(429, 'Device limit reached for this account', 'DEVICE_LIMIT')
        }
      }
    }

    const apiKey = generateDeviceApiKey()

    await registerDeviceCredential({
      anonymousUserId,
      apiKey,
      fingerprint,
      ip: clientIp,
      verified,
    })

    return NextResponse.json({ apiKey, anonymousUserId, verified })
  } catch (err) {
    return handleApiError(err)
  }
}

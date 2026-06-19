import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/utils/supabase/admin'
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
} from '@/lib/api/device-keys'

export const dynamic = 'force-dynamic'

const registerRateLimiter = new RateLimiter(10, 60 * 60 * 1000)

const RegisterSchema = z.object({
  anonymousUserId: z.string().min(1).max(128),
  fingerprint: z.union([z.string(), z.record(z.any())]).optional(),
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

    const parseResult = RegisterSchema.safeParse(await req.json())
    if (!parseResult.success) {
      const { message, details } = formatZodError(parseResult.error)
      throw new ApiError(400, message, 'INVALID_BODY', details)
    }

    const { anonymousUserId, fingerprint } = parseResult.data

    const apiKey = generateDeviceApiKey()

    await registerDeviceCredential({
      anonymousUserId,
      apiKey,
      fingerprint,
      ip: clientIp,
    })

    return NextResponse.json({ apiKey, anonymousUserId })
  } catch (err) {
    return handleApiError(err)
  }
}

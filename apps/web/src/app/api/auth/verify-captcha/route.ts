import { NextRequest, NextResponse } from 'next/server'
import { RateLimiter, getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'
import { handleApiError, ApiError } from '@/lib/api/errors'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const verifyCaptchaRateLimiter = new RateLimiter(10, 60 * 1000)

const RequestSchema = z.object({
  token: z.string().min(1),
})

interface TurnstileVerifyResponse {
  success: boolean
  'error-codes'?: string[]
  challenge_ts?: string
  hostname?: string
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req)
    const rateLimitResult = await verifyCaptchaRateLimiter.check(`captcha:${clientIp}`)
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.limit, rateLimitResult.resetAt)
    }

    const { token } = RequestSchema.parse(await req.json())
    const workerUrl = process.env.TURNSTILE_WORKER_URL

    // In local development without a worker URL we allow the request through so
    // sign-up still works, but we never skip verification in production.
    if (!workerUrl) {
      if (process.env.NODE_ENV === 'production') {
        throw new ApiError(500, 'CAPTCHA worker not configured', 'CAPTCHA_NOT_CONFIGURED')
      }
      return NextResponse.json({ success: true })
    }

    const verifyRes = await fetch(workerUrl, {
      method: 'POST',
      body: JSON.stringify({ token }),
      headers: { 'Content-Type': 'application/json' },
    })

    const outcome = (await verifyRes.json()) as TurnstileVerifyResponse
    if (!outcome.success) {
      console.warn('Turnstile verification failed:', outcome['error-codes'])
      throw new ApiError(400, 'CAPTCHA verification failed', 'CAPTCHA_FAILED')
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err)
  }
}


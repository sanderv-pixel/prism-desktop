import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { RateLimiter, getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'
import { handleApiError, ApiError, formatZodError } from '@/lib/api/errors'
import { verifyTurnstile } from '@/lib/api/turnstile'

export const dynamic = 'force-dynamic'

const signInRateLimiter = new RateLimiter(10, 60 * 60 * 1000)
const failedSignInRateLimiter = new RateLimiter(5, 15 * 60 * 1000)

const SignInSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  captchaToken: z.string().min(1),
  honeypot: z.string().max(256).optional(),
})

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req)

  const rateLimitResult = await signInRateLimiter.check(`signin:${clientIp}`)
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.limit, rateLimitResult.resetAt)
  }

  try {
    const rawBody = await req.json()
    const parseResult = SignInSchema.safeParse(rawBody)
    if (!parseResult.success) {
      const { message, details } = formatZodError(parseResult.error)
      throw new ApiError(400, message, 'INVALID_BODY', details)
    }

    const { email, password, captchaToken, honeypot } = parseResult.data

    if (honeypot) {
      // Honeypot caught a bot. Pretend a generic failure to avoid revealing the trap.
      throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS')
    }

    const isDemoBypass = captchaToken === 'demo' && process.env.NODE_ENV !== 'production'
    if (!isDemoBypass && !(await verifyTurnstile(captchaToken))) {
      throw new ApiError(400, 'CAPTCHA verification failed', 'CAPTCHA_FAILED')
    }

    const supabase = await createClient()
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError || !data.session) {
      // Apply a stricter rate limit on failed attempts to slow brute-force attacks.
      await failedSignInRateLimiter.check(`signin-failed:${clientIp}`)
      throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS')
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/utils/supabase/admin'
import { RateLimiter, getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'
import { handleApiError, ApiError, formatZodError } from '@/lib/api/errors'
import { verifyTurnstile } from '@/lib/api/turnstile'

export const dynamic = 'force-dynamic'

const waitlistRateLimiter = new RateLimiter(5, 60 * 60 * 1000)

const WaitlistSchema = z.object({
  email: z.string().email(),
  type: z.enum(['creator', 'advertiser', 'partner']).default('creator'),
  source: z.string().max(256).default('homepage'),
  captchaToken: z.string().min(1).nullable().optional(),
  honeypot: z.string().max(256).optional(),
})

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req)
  const rateLimitResult = await waitlistRateLimiter.check(`waitlist:${clientIp}`)
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.limit, rateLimitResult.resetAt)
  }

  const adminClient = createAdminClient()

  try {
    const rawBody = await req.json()
    const parseResult = WaitlistSchema.safeParse(rawBody)
    if (!parseResult.success) {
      const { message, details } = formatZodError(parseResult.error)
      throw new ApiError(400, message, 'INVALID_BODY', details)
    }

    const { email, type, source, captchaToken, honeypot } = parseResult.data

    if (honeypot) {
      // Honeypot caught a bot. Pretend success to avoid revealing the trap.
      return NextResponse.json({ success: true, message: 'You are on the waitlist.' })
    }

    if (!(await verifyTurnstile(captchaToken))) {
      throw new ApiError(400, 'CAPTCHA verification failed', 'CAPTCHA_FAILED')
    }

    const { error } = await adminClient.from('waitlist').insert({
      email: email.toLowerCase().trim(),
      type,
      source,
    })

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({
          success: true,
          message: 'You are already on the waitlist.',
        })
      }
      throw error
    }

    return NextResponse.json({ success: true, message: 'You are on the waitlist.' })
  } catch (err) {
    return handleApiError(err)
  }
}

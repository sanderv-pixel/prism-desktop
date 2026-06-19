import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/utils/supabase/admin'
import {
  RateLimiter,
  getClientIp,
  rateLimitResponse,
} from '@/lib/api/rate-limit'
import { handleApiError, ApiError, formatZodError } from '@/lib/api/errors'
import { isTrackableVisitPath } from '@/lib/visits'
import { getCountryCode } from '@/lib/geo'

export const dynamic = 'force-dynamic'

const visitRateLimiter = new RateLimiter(20, 60 * 1000)

const BOT_PATTERNS = [
  /bot/i,
  /crawl/i,
  /spider/i,
  /scrape/i,
  /curl/i,
  /wget/i,
  /python-requests/i,
  /headless/i,
  /puppeteer/i,
  /playwright/i,
  /selenium/i,
]

function isBotUserAgent(ua: string | null): boolean {
  if (!ua) return true
  return BOT_PATTERNS.some((pattern) => pattern.test(ua))
}

const VisitSchema = z.object({
  path: z.string().max(512),
})

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()

  try {
    const clientIp = getClientIp(req)
    const rateLimitResult = await visitRateLimiter.check(`visit:${clientIp}`)
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.limit, rateLimitResult.resetAt)
    }

    const userAgent = req.headers.get('user-agent')
    if (isBotUserAgent(userAgent)) {
      return NextResponse.json({ ok: true })
    }

    const parseResult = VisitSchema.safeParse(await req.json())
    if (!parseResult.success) {
      const { message, details } = formatZodError(parseResult.error)
      throw new ApiError(400, message, 'INVALID_BODY', details)
    }

    if (!isTrackableVisitPath(parseResult.data.path)) {
      return NextResponse.json({ ok: true })
    }

    await supabase.from('visits').insert({
      path: parseResult.data.path,
      ip: clientIp,
      user_agent: userAgent,
      referrer: req.headers.get('referer'),
      country: getCountryCode(req),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleApiError(err)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { kvIncr, redis } from '@/lib/redis'
import { ApiError } from './errors'

interface RateLimitEntry {
  count: number
  resetAt: number
}

export class RateLimiter {
  private memoryStore = new Map<string, RateLimitEntry>()

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  async check(key: string): Promise<{
    success: boolean
    limit: number
    remaining: number
    resetAt: number
  }> {
    const now = Date.now()
    const windowSeconds = Math.max(1, Math.ceil(this.windowMs / 1000))
    const redisKey = `rl:${key}`

    // In production we require a real Redis backend. Without it we cannot
    // coordinate rate limits across instances, so we fail closed.
    if (process.env.NODE_ENV === 'production' && !redis) {
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        resetAt: now + this.windowMs,
      }
    }

    try {
      const count = await kvIncr(redisKey, windowSeconds)
      const resetAt = now + this.windowMs
      const remaining = Math.max(0, this.maxRequests - count)
      return {
        success: count <= this.maxRequests,
        limit: this.maxRequests,
        remaining,
        resetAt,
      }
    } catch {
      // In production, never fall back to an in-memory store because it cannot
      // be shared across instances. Fail closed instead.
      if (process.env.NODE_ENV === 'production') {
        return {
          success: false,
          limit: this.maxRequests,
          remaining: 0,
          resetAt: now + this.windowMs,
        }
      }
      // Fallback to in-memory store in development only.
    }

    const existing = this.memoryStore.get(key)

    if (!existing || now > existing.resetAt) {
      const resetAt = now + this.windowMs
      this.memoryStore.set(key, { count: 1, resetAt })
      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        resetAt,
      }
    }

    if (existing.count >= this.maxRequests) {
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        resetAt: existing.resetAt,
      }
    }

    existing.count++
    return {
      success: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - existing.count,
      resetAt: existing.resetAt,
    }
  }
}

export function getClientIp(req: NextRequest): string {
  // Prefer the platform-provided IP when available (Next.js/Vercel).
  const platformIp = (req as any).ip
  if (platformIp) return platformIp

  // In production we still need a usable key. Vercel and Cloudflare set these
  // headers on the edge, so the last/right-most value is the real client IP.
  const forwarded = req.headers.get('x-forwarded-for')
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    forwarded?.split(',').pop()?.trim() ||
    'unknown'
  )
}

export function rateLimitResponse(
  limit: number,
  resetAt: number
): NextResponse {
  const resetSeconds = Math.max(0, Math.ceil((resetAt - Date.now()) / 1000))
  return NextResponse.json(
    {
      error: `Too many requests. Please slow down and try again in ${resetSeconds} second${
        resetSeconds === 1 ? '' : 's'
      }.`,
      code: 'RATE_LIMITED',
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
      },
    }
  )
}

export async function checkRateLimit(
  limiter: RateLimiter,
  key: string
): Promise<NextResponse | null> {
  const result = await limiter.check(key)
  if (!result.success) {
    return rateLimitResponse(result.limit, result.resetAt)
  }
  return null
}

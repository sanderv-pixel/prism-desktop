import { User } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { RateLimiter } from './api/rate-limit'

export const adminRateLimiter = new RateLimiter(60, 60 * 60 * 1000)

export function isAdmin(user: User | null): boolean {
  if (!user?.email) return false
  const adminEmails = (process.env.PRISM_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return adminEmails.includes(user.email.toLowerCase())
}

/**
 * Optional second factor for admin API routes. When PRISM_ADMIN_SECRET is set
 * in production, admin endpoints require it in the X-Admin-Secret header.
 * Returns true if no secret is configured or if the header matches.
 */
export async function isValidAdminSecret(secretHeader: string | null): Promise<boolean> {
  const expected = process.env.PRISM_ADMIN_SECRET
  // If no admin secret is configured, the check is skipped.
  if (!expected) {
    return true
  }
  if (!secretHeader) return false
  try {
    const { timingSafeEqual } = await import('crypto')
    return timingSafeEqual(
      Buffer.from(secretHeader),
      Buffer.from(expected)
    )
  } catch {
    return false
  }
}

export interface AdminAuthResult {
  user: User
  response?: never
}

export interface AdminAuthFailure {
  user?: never
  response: NextResponse
}

export type AdminAuthOutcome = AdminAuthResult | AdminAuthFailure

export async function requireAdminAuth(
  req: NextRequest,
  user: User | null
): Promise<AdminAuthOutcome> {
  if (!user) {
    return {
      response: NextResponse.json(
        { error: 'Sign in required', code: 'SIGN_IN_REQUIRED' },
        { status: 401 }
      ),
    }
  }

  if (!isAdmin(user)) {
    return {
      response: NextResponse.json(
        {
          error: 'Your account is not in the admin allow-list',
          code: 'ADMIN_EMAIL_REQUIRED',
          hint: 'Add your email to PRISM_ADMIN_EMAILS and sign in again.',
        },
        { status: 403 }
      ),
    }
  }

  const secretHeader = req.headers.get('x-admin-secret')
  const secretValid = await isValidAdminSecret(secretHeader)
  if (!secretValid) {
    const expected = process.env.PRISM_ADMIN_SECRET
    return {
      response: NextResponse.json(
        {
          error: expected
            ? 'Invalid or missing X-Admin-Secret header'
            : 'PRISM_ADMIN_SECRET is not configured on the server',
          code: 'ADMIN_SECRET_REQUIRED',
          headerPresent: !!secretHeader,
          receivedLength: secretHeader?.length ?? 0,
          expectedLength: expected?.length ?? 0,
          hint: expected
            ? 'Enter the admin secret in the sidebar.'
            : 'Set PRISM_ADMIN_SECRET in your environment and redeploy.',
        },
        { status: 403 }
      ),
    }
  }

  return { user }
}

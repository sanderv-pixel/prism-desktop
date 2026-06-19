import { NextResponse } from 'next/server'
import type { ZodError } from 'zod'

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
    public readonly details?: Record<string, string[]>
  ) {
    super(message)
  }
}

/**
 * Turn a Zod error into a short, user-friendly sentence.
 * Returns a structured `details` object as well so API clients can highlight
 * specific fields.
 */
export function formatZodError(error: ZodError): {
  message: string
  details: Record<string, string[]>
} {
  const flattened = error.flatten()
  const fieldErrors = flattened.fieldErrors as Record<string, string[] | undefined>
  const details: Record<string, string[]> = {}

  const fieldMessages: string[] = []
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (!messages || messages.length === 0) continue
    details[field] = messages
    const label = field.replace(/_/g, ' ')
    fieldMessages.push(`${label}: ${messages[0]}`)
  }

  const formErrors = flattened.formErrors ?? []
  if (formErrors.length > 0) {
    details._form = formErrors
    fieldMessages.push(formErrors[0])
  }

  const message =
    fieldMessages.length > 0
      ? `Check your input: ${fieldMessages.slice(0, 3).join('; ')}.`
      : 'Check your input and try again.'

  return { message, details }
}

const FRIENDLY_ERROR_OVERRIDES: Record<string, { error: string; status?: number }> = {
  UNAUTHORIZED: {
    error: 'Please sign in to continue.',
  },
  FORBIDDEN: {
    error: "You don't have permission to do that.",
  },
  NOT_FOUND: {
    error: "We couldn't find what you're looking for.",
  },
  RATE_LIMITED: {
    error: 'Too many requests. Please slow down and try again in a moment.',
  },
  INTERNAL_ERROR: {
    error: 'Something went wrong on our end. Please try again, or contact support if it persists.',
  },
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: FRIENDLY_ERROR_OVERRIDES.UNAUTHORIZED.error, code: 'UNAUTHORIZED' },
    { status: 401 }
  )
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    const friendly = err.code ? FRIENDLY_ERROR_OVERRIDES[err.code] : undefined
    // Keep a field-level message from formatZodError when available.
    const error =
      err.code === 'INVALID_BODY' && err.message
        ? err.message
        : friendly?.error ?? err.message
    const status = friendly?.status ?? err.statusCode
    const payload: Record<string, unknown> = { error }
    if (err.code) payload.code = err.code
    if (err.details && Object.keys(err.details).length > 0) payload.details = err.details
    return NextResponse.json(payload, { status })
  }

  // Never leak internal error messages to clients.
  console.error('API error:', err)
  return NextResponse.json(
    {
      error: FRIENDLY_ERROR_OVERRIDES.INTERNAL_ERROR.error,
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  )
}

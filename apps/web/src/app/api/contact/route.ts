import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/utils/supabase/admin'
import { RateLimiter, getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'
import { handleApiError, ApiError } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'

const contactRateLimiter = new RateLimiter(3, 60 * 60 * 1000)

const ContactSchema = z.object({
  name: z.string().min(1).max(128),
  email: z.string().email().max(254),
  message: z.string().min(10).max(2000),
  honeypot: z.string().max(256).optional(),
})

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req)
  const rateLimitResult = await contactRateLimiter.check(`contact:${clientIp}`)
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.limit, rateLimitResult.resetAt)
  }

  const adminClient = createAdminClient()

  try {
    const rawBody = await req.json()
    const parseResult = ContactSchema.safeParse(rawBody)
    if (!parseResult.success) {
      throw new ApiError(400, 'Please fill out all fields correctly.', 'INVALID_BODY')
    }

    const { name, email, message, honeypot } = parseResult.data

    if (honeypot) {
      return NextResponse.json({ success: true, message: 'Message sent.' })
    }

    // Always store the submission so it is never lost.
    // We use type 'partner' as a temporary workaround because the waitlist
    // table's check constraint only allows creator/advertiser/partner.
    // TODO: add 'contact' to the valid_waitlist_type constraint or create a
    // dedicated contact_submissions table.
    const { error: storeError } = await adminClient.from('waitlist').insert({
      email: email.toLowerCase().trim(),
      type: 'partner',
      source: JSON.stringify({ form: 'contact', name, message: message.slice(0, 2000) }),
    })

    if (storeError) {
      console.error('Failed to store contact submission:', storeError)
      throw new ApiError(500, "We couldn't save your message right now. Please try again later.", 'STORE_FAILED')
    }

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not configured. Contact submission stored in waitlist.', {
        name,
        email,
      })
      return NextResponse.json({
        success: true,
        message: 'Message sent. We will get back to you soon.',
      })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Prism Contact <hello@goprism.dev>',
        to: ['hello@goprism.dev'],
        reply_to: `${name} <${email}>`,
        subject: `New contact form message from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      console.error('Resend error:', body)
      // Submission is already stored, so we can still tell the user it worked.
    }

    return NextResponse.json({ success: true, message: 'Message sent. We will get back to you soon.' })
  } catch (err) {
    return handleApiError(err)
  }
}

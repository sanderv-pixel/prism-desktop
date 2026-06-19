import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendBuilderWelcomeEmail } from '@/lib/email/helpers'

function safeRedirect(next: string): string {
  // Only allow same-origin relative paths to prevent open redirects.
  if (next.startsWith('/') && !next.startsWith('//')) {
    return next
  }
  return '/'
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user && !user.user_metadata?.welcome_email_sent) {
          await sendBuilderWelcomeEmail(user.id)
          await createAdminClient().auth.admin.updateUserById(user.id, {
            user_metadata: { ...user.user_metadata, welcome_email_sent: true },
          })
        }
      } catch {
        // Never block the confirmation redirect because of an email failure.
      }

      return NextResponse.redirect(new URL(safeRedirect(next), request.url))
    }
  }

  return NextResponse.redirect(new URL('/auth/sign-in?error=confirmation_failed', request.url))
}

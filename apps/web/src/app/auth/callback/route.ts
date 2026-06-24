import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

// OAuth (and any PKCE) callback. Exchanges the auth code for a session using the
// cookies-based server client (route handlers must NOT use the middleware client,
// which calls NextResponse.next()). Errors degrade to the sign-in page instead of 500.
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('redirect') ?? '/dashboard'

  if (code) {
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        // Persist consent for a fresh OAuth signup (cookie set by OAuthButtons before
        // redirect). Sign-in carries no consent cookie, so this is skipped there.
        const consent = req.cookies.get('prism_oauth_consent')?.value
        if (consent) {
          const acceptedAt = decodeURIComponent(consent)
          await supabase.auth.updateUser({
            data: { accepted_terms_at: acceptedAt, accepted_privacy_at: acceptedAt },
          })
          ;(await cookies()).delete('prism_oauth_consent')
        }
        return NextResponse.redirect(`${origin}${next}`)
      }
      console.error('OAuth callback exchange failed:', error.message)
    } catch (err) {
      console.error('OAuth callback exception:', err)
    }
  }

  return NextResponse.redirect(`${origin}/auth/sign-in?error=callback_failed`)
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/middleware'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('redirect') ?? '/advertiser/dashboard'

  if (code) {
    const { supabase, response } = await createClient(req)
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Persist consent for a fresh OAuth signup. OAuthButtons sets this cookie right
      // before redirecting (the click, after the Terms/Privacy microcopy, is consent).
      const consent = req.cookies.get('prism_oauth_consent')?.value
      if (consent) {
        const acceptedAt = decodeURIComponent(consent)
        await supabase.auth.updateUser({
          data: { accepted_terms_at: acceptedAt, accepted_privacy_at: acceptedAt },
        })
        response.cookies.set('prism_oauth_consent', '', { path: '/', maxAge: 0 })
      }
      return NextResponse.redirect(`${origin}${next}`, {
        headers: response.headers,
      })
    }
    console.error('Auth callback error:', error)
  }

  return NextResponse.redirect(`${origin}/auth/sign-in?error=callback_failed`)
}

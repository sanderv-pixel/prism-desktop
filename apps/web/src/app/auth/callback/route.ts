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
      return NextResponse.redirect(`${origin}${next}`, {
        headers: response.headers,
      })
    }
    console.error('Auth callback error:', error)
  }

  return NextResponse.redirect(`${origin}/auth/sign-in?error=callback_failed`)
}

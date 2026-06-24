import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/middleware'
import { validateProductionEnv } from '@/lib/env'

// Fail fast in production if required secrets are missing.
validateProductionEnv()

const protectedRoutes = [
  '/dashboard',
  '/onboarding',
  // Trailing slash so this covers every advertiser sub-page (dashboard, campaigns,
  // billing, settings, conversions, onboarding) without matching the public
  // `/advertisers` marketing page.
  '/advertiser/',
  '/admin',
]

const protectedApiPrefixes = [
  '/api/advertisers',
  '/api/campaigns',
  '/api/checkout',
  '/api/dashboard',
  '/api/admin',
]

function isProtected(req: NextRequest): boolean {
  const pathname = req.nextUrl.pathname
  if (protectedRoutes.some((route) => pathname.startsWith(route))) return true
  if (protectedApiPrefixes.some((prefix) => pathname.startsWith(prefix))) return true
  return false
}

function isAdminRoute(req: NextRequest): boolean {
  return req.nextUrl.pathname.startsWith('/admin')
}

function isAdminApiRoute(req: NextRequest): boolean {
  return req.nextUrl.pathname.startsWith('/api/admin')
}

function isAdmin(email: string): boolean {
  const adminEmails = (process.env.PRISM_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return adminEmails.includes(email.toLowerCase())
}

const EXTENSION_ORIGIN_PREFIXES = [
  'vscode-webview://',
  'cursor-webview://',
  'vscode-file://vscode-app',
]

function isExtensionOrigin(origin: string): boolean {
  if (!origin) return false
  return EXTENSION_ORIGIN_PREFIXES.some((prefix) => origin.startsWith(prefix))
}

function getOrigin(req: NextRequest): string {
  const origin = req.headers.get('origin') ?? ''
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  // In production, only reflect the configured site URL or trusted extension origins.
  if (process.env.NODE_ENV === 'production') {
    if (isExtensionOrigin(origin)) return origin
    return siteUrl || 'https://goprism.dev'
  }
  if (!origin) return siteUrl || 'http://localhost:3003'
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return origin
  if (isExtensionOrigin(origin)) return origin
  const allowedOrigins = [
    'https://goprism.dev',
    'https://www.goprism.dev',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004',
  ]
  return allowedOrigins.includes(origin) ? origin : (siteUrl || 'http://localhost:3003')
}

function getPublicApiOrigin(req: NextRequest): string {
  const origin = req.headers.get('origin') ?? ''
  // Desktop/electron apps and local HTML files send Origin: null.
  if (origin === 'null') return 'null'
  return getOrigin(req)
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://*.turnstile.com https://js.stripe.com https://*.stripe.com https://static.cloudflareinsights.com https://www.googletagmanager.com https://*.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com; style-src 'self' 'unsafe-inline'; img-src 'self' https: data: https://*.stripe.com https://www.google-analytics.com https://*.google-analytics.com; font-src 'self'; connect-src 'self' https://*.supabase.co https://api.stripe.com https://*.stripe.com https://www.google-analytics.com https://*.google-analytics.com; frame-src 'self' https://challenges.cloudflare.com https://*.turnstile.com https://js.stripe.com https://*.stripe.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
  )
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('Vary', 'Origin')
  return response
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // CORS preflight for API routes.
  if (pathname.startsWith('/api/')) {
    const response = addSecurityHeaders(NextResponse.next())
    // Public ad/impression endpoints are called from VS Code/Cursor webviews
    // and desktop apps. Only reflect known extension origins instead of '*'.
    const isPublicApi = pathname.startsWith('/api/ads') || pathname.startsWith('/api/impressions')
    response.headers.set('Access-Control-Allow-Origin', isPublicApi ? getPublicApiOrigin(req) : getOrigin(req))
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Prism-Client, X-Prism-Api-Key')
    response.headers.set('Access-Control-Max-Age', '86400')

    if (req.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: response.headers })
    }
    return response
  }

  // For non-protected pages, just add security headers and continue.
  if (!isProtected(req)) {
    return addSecurityHeaders(NextResponse.next())
  }

  // Protected pages: use Supabase client so session cookies are refreshed.
  const { supabase, response } = await createClient(req)
  addSecurityHeaders(response)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const redirectUrl = new URL('/auth/sign-in', req.url)
    redirectUrl.searchParams.set('redirect', pathname)
    if (isAdminRoute(req)) redirectUrl.searchParams.set('admin_required', '1')
    return NextResponse.redirect(redirectUrl)
  }

  // Admin page routes require an explicit admin email allow-list.
  if (isAdminRoute(req) && !isAdmin(user.email ?? '')) {
    const redirectUrl = new URL('/auth/sign-in', req.url)
    redirectUrl.searchParams.set('redirect', pathname)
    redirectUrl.searchParams.set('admin_required', '1')
    return NextResponse.redirect(redirectUrl)
  }

  // Admin API routes require an explicit admin email allow-list.
  if (isAdminApiRoute(req) && !isAdmin(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const TOKEN = 'prism-cleanup-2024'

const REQUIRED = [
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'PRISM_IMPRESSION_SECRET',
  'PRISM_API_KEYS',
  'PRISM_ADMIN_EMAILS',
  'PRISM_ADMIN_SECRET',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
  'TURNSTILE_WORKER_URL',
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('token') !== TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const missing = REQUIRED.filter((name) => {
    const value = process.env[name]
    return typeof value !== 'string' || value.trim().length === 0
  })

  const listVars = ['PRISM_API_KEYS', 'PRISM_ADMIN_EMAILS']
  const invalidList: string[] = []
  for (const name of listVars) {
    const raw = process.env[name]
    if (typeof raw === 'string') {
      const items = raw.split(',').map((s) => s.trim()).filter(Boolean)
      if (items.length === 0) invalidList.push(name)
    }
  }

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    missing,
    invalidList,
    all: REQUIRED.map((name) => ({ name, present: !!process.env[name] })),
  })
}

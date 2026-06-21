import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'

async function linkedUserIds(userId: string): Promise<string[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('builder_identities')
    .select('anonymous_user_id')
    .eq('auth_user_id', userId)
  return [userId, ...(data ?? []).map((i) => i.anonymous_user_id)]
}

// Connected overlay devices for the signed-in creator.
export async function GET() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const ids = await linkedUserIds(user.id)
  const { data } = await supabase
    .from('device_credentials')
    .select('id, created_at, last_used_at, last_seen_ip, fingerprint_hash, revoked')
    .in('anonymous_user_id', ids)
    .order('last_used_at', { ascending: false, nullsFirst: false })

  const now = Date.now()
  const devices = (data ?? []).map((d) => {
    const last = d.last_used_at ? new Date(d.last_used_at).getTime() : 0
    return {
      id: d.id,
      createdAt: d.created_at,
      lastUsedAt: d.last_used_at,
      lastSeenIp: d.last_seen_ip,
      hasFingerprint: Boolean(d.fingerprint_hash),
      revoked: d.revoked,
      active: !d.revoked && last > 0 && now - last < 5 * 60 * 1000,
    }
  })
  return NextResponse.json({ devices })
}

const RevokeSchema = z.object({ id: z.string().uuid().optional(), all: z.boolean().optional() })

// Revoke (disconnect) a device, or all of them. Takes effect within ~5 minutes
// (key cache TTL). Scoped to the creator's own devices.
export async function POST(req: NextRequest) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = RevokeSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success || (!parsed.data.id && !parsed.data.all)) {
    return NextResponse.json({ error: 'Invalid device' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const ids = await linkedUserIds(user.id)
  let query = supabase.from('device_credentials').update({ revoked: true }).in('anonymous_user_id', ids)
  if (!parsed.data.all && parsed.data.id) query = query.eq('id', parsed.data.id)
  const { error } = await query
  if (error) return NextResponse.json({ error: 'Could not revoke device' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

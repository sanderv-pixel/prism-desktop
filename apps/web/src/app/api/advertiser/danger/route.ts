import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { logAudit } from '@/lib/audit'
import { getClientIp } from '@/lib/api/rate-limit'

export const dynamic = 'force-dynamic'

const Schema = z.object({ action: z.enum(['pauseAll', 'close']) })

// Reversible destructive actions for the settings danger zone. Neither deletes data
// or the wallet balance: pauseAll stops delivery; close also deactivates the account
// (reopenable by support).
export async function POST(req: NextRequest) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = Schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: advertiser } = await supabase
    .from('advertisers')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!advertiser) return NextResponse.json({ error: 'Advertiser not found' }, { status: 404 })

  // Pause every active campaign in both actions.
  const { error: pauseError } = await supabase
    .from('campaigns')
    .update({ status: 'paused' })
    .eq('advertiser_id', advertiser.id)
    .eq('status', 'active')
  if (pauseError) return NextResponse.json({ error: 'Could not pause campaigns' }, { status: 500 })

  if (parsed.data.action === 'close') {
    const { error: closeError } = await supabase
      .from('advertisers')
      .update({ status: 'closed' })
      .eq('id', advertiser.id)
    if (closeError) return NextResponse.json({ error: 'Could not close account' }, { status: 500 })
  }

  await logAudit({
    actorId: user.id,
    actorEmail: user.email ?? undefined,
    action: parsed.data.action === 'close' ? 'advertiser.close' : 'advertiser.pause_all',
    targetType: 'advertiser',
    targetId: advertiser.id,
    ipAddress: getClientIp(req),
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}

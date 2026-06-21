import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'

const Schema = z.object({
  notifyPayout: z.boolean().optional(),
  notifyProduct: z.boolean().optional(),
})

export async function GET() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('builder_payout_settings')
    .select('payout_provider, kyc_status, payouts_enabled, notify_payout, notify_product')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  return NextResponse.json({
    email: user.email,
    payoutProvider: data?.payout_provider ?? null,
    kycStatus: data?.kyc_status ?? null,
    payoutsEnabled: data?.payouts_enabled ?? false,
    notifyPayout: data?.notify_payout ?? true,
    notifyProduct: data?.notify_product ?? false,
  })
}

export async function PATCH(req: NextRequest) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = Schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid settings' }, { status: 400 })

  const update: { notify_payout?: boolean; notify_product?: boolean } = {}
  if (parsed.data.notifyPayout !== undefined) update.notify_payout = parsed.data.notifyPayout
  if (parsed.data.notifyProduct !== undefined) update.notify_product = parsed.data.notifyProduct

  const supabase = createAdminClient()
  // Upsert keyed by auth_user_id so a creator without payout settings can still
  // save notification preferences.
  const { error } = await supabase
    .from('builder_payout_settings')
    .upsert({ auth_user_id: user.id, ...update }, { onConflict: 'auth_user_id' })
  if (error) return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

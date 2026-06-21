import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'

const Schema = z.object({
  enabled: z.boolean().optional(),
  thresholdCents: z.number().int().min(500).max(1_000_000).optional(),
  amountCents: z.number().int().min(1000).max(10_000_000).optional(),
})

export async function GET() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('advertisers')
    .select('auto_recharge_enabled, auto_recharge_threshold_cents, auto_recharge_amount_cents, default_payment_method_id')
    .eq('user_id', user.id)
    .single()
  if (!data) return NextResponse.json({ error: 'Advertiser not found' }, { status: 404 })
  return NextResponse.json({
    enabled: data.auto_recharge_enabled,
    thresholdCents: data.auto_recharge_threshold_cents,
    amountCents: data.auto_recharge_amount_cents,
    hasSavedCard: Boolean(data.default_payment_method_id),
  })
}

export async function PATCH(req: NextRequest) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = Schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid settings' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: advertiser } = await supabase
    .from('advertisers')
    .select('id, default_payment_method_id')
    .eq('user_id', user.id)
    .single()
  if (!advertiser) return NextResponse.json({ error: 'Advertiser not found' }, { status: 404 })

  // Can't enable without a saved card to charge.
  if (parsed.data.enabled && !advertiser.default_payment_method_id) {
    return NextResponse.json(
      { error: 'Add a payment method first by completing a top-up.', code: 'NO_CARD' },
      { status: 409 }
    )
  }

  const update: {
    auto_recharge_enabled?: boolean
    auto_recharge_threshold_cents?: number
    auto_recharge_amount_cents?: number
  } = {}
  if (parsed.data.enabled !== undefined) update.auto_recharge_enabled = parsed.data.enabled
  if (parsed.data.thresholdCents !== undefined) update.auto_recharge_threshold_cents = parsed.data.thresholdCents
  if (parsed.data.amountCents !== undefined) update.auto_recharge_amount_cents = parsed.data.amountCents

  const { error } = await supabase.from('advertisers').update(update).eq('id', advertiser.id)
  if (error) return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

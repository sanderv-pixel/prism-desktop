import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'

const Schema = z.object({
  name: z.string().min(1).max(80).optional(),
  website: z.string().url().max(200).nullable().optional(),
  notifyBudget: z.boolean().optional(),
  notifyLowBalance: z.boolean().optional(),
  notifyCampaignStatus: z.boolean().optional(),
})

export async function GET() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('advertisers')
    .select('name, email, website, notify_budget, notify_low_balance, notify_campaign_status')
    .eq('user_id', user.id)
    .single()
  if (!data) return NextResponse.json({ error: 'Advertiser not found' }, { status: 404 })
  return NextResponse.json({
    name: data.name,
    email: data.email,
    website: data.website,
    notifyBudget: data.notify_budget,
    notifyLowBalance: data.notify_low_balance,
    notifyCampaignStatus: data.notify_campaign_status,
  })
}

export async function PATCH(req: NextRequest) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = Schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid settings' }, { status: 400 })

  const update: {
    name?: string
    website?: string | null
    notify_budget?: boolean
    notify_low_balance?: boolean
    notify_campaign_status?: boolean
  } = {}
  const d = parsed.data
  if (d.name !== undefined) update.name = d.name
  if (d.website !== undefined) update.website = d.website || null
  if (d.notifyBudget !== undefined) update.notify_budget = d.notifyBudget
  if (d.notifyLowBalance !== undefined) update.notify_low_balance = d.notifyLowBalance
  if (d.notifyCampaignStatus !== undefined) update.notify_campaign_status = d.notifyCampaignStatus

  const supabase = createAdminClient()
  const { error } = await supabase.from('advertisers').update(update).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

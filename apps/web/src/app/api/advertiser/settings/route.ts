import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'

const Schema = z.object({
  name: z.string().min(1).max(80).optional(),
  website: z.string().url().max(200).nullable().optional(),
  supportEmail: z.string().max(200).nullable().optional(),
  notifyBudget: z.boolean().optional(),
  notifyLowBalance: z.boolean().optional(),
  notifyCampaignStatus: z.boolean().optional(),
  notifyWeeklySummary: z.boolean().optional(),
  notifyReceipts: z.boolean().optional(),
})

export async function GET() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  // Cast: support_email / notify_weekly_summary / notify_receipts are newer than
  // the checked-in generated Supabase types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = (await (supabase.from('advertisers') as any)
    .select(
      'id, name, email, website, support_email, status, created_at, balance_cents, lifetime_deposits_cents, notify_budget, notify_low_balance, notify_campaign_status, notify_weekly_summary, notify_receipts'
    )
    .eq('user_id', user.id)
    .single()) as { data: Record<string, any> | null }
  if (!data) return NextResponse.json({ error: 'Advertiser not found' }, { status: 404 })
  return NextResponse.json({
    id: data.id,
    name: data.name,
    email: data.email,
    website: data.website,
    supportEmail: data.support_email,
    status: data.status,
    createdAt: data.created_at,
    balanceCents: data.balance_cents,
    lifetimeDepositsCents: data.lifetime_deposits_cents,
    notifyBudget: data.notify_budget,
    notifyLowBalance: data.notify_low_balance,
    notifyCampaignStatus: data.notify_campaign_status,
    notifyWeeklySummary: data.notify_weekly_summary,
    notifyReceipts: data.notify_receipts,
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
    support_email?: string | null
    notify_budget?: boolean
    notify_low_balance?: boolean
    notify_campaign_status?: boolean
    notify_weekly_summary?: boolean
    notify_receipts?: boolean
  } = {}
  const d = parsed.data
  if (d.name !== undefined) update.name = d.name
  if (d.website !== undefined) update.website = d.website || null
  if (d.supportEmail !== undefined) update.support_email = d.supportEmail || null
  if (d.notifyBudget !== undefined) update.notify_budget = d.notifyBudget
  if (d.notifyLowBalance !== undefined) update.notify_low_balance = d.notifyLowBalance
  if (d.notifyCampaignStatus !== undefined) update.notify_campaign_status = d.notifyCampaignStatus
  if (d.notifyWeeklySummary !== undefined) update.notify_weekly_summary = d.notifyWeeklySummary
  if (d.notifyReceipts !== undefined) update.notify_receipts = d.notifyReceipts

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('advertisers') as any).update(update).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

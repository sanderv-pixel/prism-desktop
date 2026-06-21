import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { handleApiError, ApiError } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'

const CreativeSchema = z.object({
  copy: z.string().min(1).max(40),
  brandName: z.string().max(14).optional(),
  url: z.string().url(),
  iconUrl: z.string().optional(),
})

// Verify the campaign belongs to the authenticated advertiser; returns its id.
async function ownedCampaign(supabase: ReturnType<typeof createAdminClient>, userId: string, campaignId: string) {
  const { data: advertiser } = await supabase.from('advertisers').select('id').eq('user_id', userId).single()
  if (!advertiser) throw new ApiError(404, 'Advertiser not found', 'NO_ADVERTISER')
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id')
    .eq('id', campaignId)
    .eq('advertiser_id', advertiser.id)
    .single()
  if (!campaign) throw new ApiError(404, 'Campaign not found', 'NOT_FOUND')
  return campaign.id
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  try {
    await ownedCampaign(supabase, user.id, params.id)
    const { data } = await supabase
      .from('campaign_creatives')
      .select('id, copy, brand_name, url, icon_url, status, impression_count, click_count, created_at')
      .eq('campaign_id', params.id)
      .order('created_at', { ascending: true })
    const creatives = (data ?? []).map((c) => ({
      id: c.id,
      copy: c.copy,
      brandName: c.brand_name,
      url: c.url,
      iconUrl: c.icon_url,
      status: c.status,
      impressions: c.impression_count,
      clicks: c.click_count,
      ctr: c.impression_count > 0 ? Number(((c.click_count / c.impression_count) * 100).toFixed(2)) : 0,
    }))
    return NextResponse.json({ creatives })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  try {
    await ownedCampaign(supabase, user.id, params.id)
    const parsed = CreativeSchema.safeParse(await req.json())
    if (!parsed.success) throw new ApiError(400, 'Invalid creative', 'INVALID_BODY')
    const { copy, brandName, url, iconUrl } = parsed.data
    const { data, error } = await supabase
      .from('campaign_creatives')
      .insert({
        campaign_id: params.id,
        copy,
        brand_name: brandName?.trim() || null,
        url,
        icon_url: iconUrl || null,
        status: 'active',
      })
      .select('id')
      .single()
    if (error) throw error
    return NextResponse.json({ ok: true, id: data.id })
  } catch (err) {
    return handleApiError(err)
  }
}

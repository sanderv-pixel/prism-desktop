import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { handleApiError, ApiError } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'

const PatchSchema = z.object({ status: z.enum(['active', 'paused']) })

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
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; cid: string } }) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  try {
    await ownedCampaign(supabase, user.id, params.id)
    const parsed = PatchSchema.safeParse(await req.json())
    if (!parsed.success) throw new ApiError(400, 'Invalid status', 'INVALID_BODY')
    const { error } = await supabase
      .from('campaign_creatives')
      .update({ status: parsed.data.status })
      .eq('id', params.cid)
      .eq('campaign_id', params.id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; cid: string } }) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  try {
    await ownedCampaign(supabase, user.id, params.id)
    // Keep at least one creative so the campaign can still serve.
    const { count } = await supabase
      .from('campaign_creatives')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', params.id)
    if ((count ?? 0) <= 1) {
      throw new ApiError(409, 'A campaign needs at least one creative.', 'LAST_CREATIVE')
    }
    const { error } = await supabase
      .from('campaign_creatives')
      .delete()
      .eq('id', params.cid)
      .eq('campaign_id', params.id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleApiError(err)
  }
}

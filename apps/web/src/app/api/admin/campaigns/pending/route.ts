import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireAdminAuth, adminRateLimiter } from '@/lib/admin'
import { getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'
import { handleApiError } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const auth = await requireAdminAuth(req, user)
    if (auth.response) return auth.response

    const rateLimitResult = await adminRateLimiter.check(getClientIp(req))
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.limit, rateLimitResult.resetAt)
    }

    // Use the service-role client for admin reads so RLS does not restrict
    // the review queue to the advertiser that owns each campaign.
    const adminClient = createAdminClient()
    const { data: campaigns, error } = await adminClient
      .from('campaigns')
      .select('*, advertisers(id, name, email, website, status)')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(campaigns ?? [])
  } catch (err) {
    return handleApiError(err)
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireApiKey, getRequestDeviceUserId } from '@/lib/api/auth'
import { handleApiError } from '@/lib/api/errors'
import { getOverlayEarnings } from '@/lib/earnings'

// Lightweight earnings snapshot for the overlay's expanded ad panel. Authed with
// the same X-Prism-Api-Key the overlay already uses. Reuses the dashboard's
// earnings sources (no recompute). Fetched lazily on panel open + piggybacked on
// the ad-refresh cycle; the overlay caches and renders from cache instantly.
export const dynamic = 'force-dynamic'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Prism-Api-Key',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

export async function GET(req: NextRequest) {
  try {
    const authResponse = await requireApiKey(req)
    if (authResponse) return authResponse // 401 / 429

    // The earner id bound to the device key (== auth user id for signed-in users).
    const userId = await getRequestDeviceUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'No earner account for this key' }, { status: 404, headers: corsHeaders() })
    }

    const admin = createAdminClient()
    const { data: identities } = await admin
      .from('builder_identities')
      .select('anonymous_user_id')
      .eq('auth_user_id', userId)
    const userIds = [userId, ...((identities ?? []).map((i) => i.anonymous_user_id))]

    const earnings = await getOverlayEarnings(admin, userIds, userId)
    return NextResponse.json(earnings, { headers: corsHeaders() })
  } catch (err) {
    return handleApiError(err)
  }
}

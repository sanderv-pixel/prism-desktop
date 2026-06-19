import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireAdminAuth, adminRateLimiter } from '@/lib/admin'
import { getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'
import { handleApiError } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const auth = await requireAdminAuth(req, user)
    if (auth.response) return auth.response

    const rateLimitResult = await adminRateLimiter.check(getClientIp(req))
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.limit, rateLimitResult.resetAt)
    }

    const { searchParams } = req.nextUrl
    const status = searchParams.get('status') ?? 'pending_review'
    const limit = Math.min(250, Math.max(1, Number(searchParams.get('limit') ?? '100')))
    const offset = Math.max(0, Number(searchParams.get('offset') ?? '0'))

    const { data: payouts, error } = await adminClient
      .from('payouts')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    const userIds = Array.from(new Set((payouts ?? []).map((p) => p.user_id)))

    let emailMap = new Map<string, string>()
    if (userIds.length > 0) {
      const userResults = await Promise.all(
        userIds.map((id) => adminClient.auth.admin.getUserById(id))
      )
      emailMap = new Map(
        userResults
          .filter((r) => !r.error && r.data?.user != null)
          .map((r) => {
            const u = r.data!.user!
            return [u.id, u.email ?? '']
          })
      )
    }

    const { data: settingsRows } = await adminClient
      .from('builder_payout_settings')
      .select('auth_user_id, payout_provider, recipient_details')
      .in('auth_user_id', userIds)

    const settingsMap = new Map(
      (settingsRows ?? []).map((s) => [
        s.auth_user_id,
        {
          provider: s.payout_provider,
          recipientDetails: s.recipient_details as Record<string, unknown>,
        },
      ])
    )

    return NextResponse.json(
      (payouts ?? []).map((p) => ({
        id: p.id,
        userId: p.user_id,
        userEmail: emailMap.get(p.user_id) ?? '',
        amountCents: p.amount_cents,
        status: p.status,
        createdAt: p.created_at,
        paidAt: p.paid_at,
        reviewedAt: p.reviewed_at,
        reviewedBy: p.reviewed_by,
        rejectionReason: p.rejection_reason,
        provider: settingsMap.get(p.user_id)?.provider ?? null,
        recipientDetails: settingsMap.get(p.user_id)?.recipientDetails ?? {},
      }))
    )
  } catch (err) {
    return handleApiError(err)
  }
}

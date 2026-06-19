import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireAdminAuth, adminRateLimiter } from '@/lib/admin'
import { getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'
import { handleApiError, ApiError } from '@/lib/api/errors'
import { logAudit } from '@/lib/audit'
import { getProvider } from '@/lib/payouts/providers'
import { sendPayoutPaidEmail, sendPayoutRejectedEmail } from '@/lib/email/helpers'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const payoutId = params.id
    if (!payoutId) {
      throw new ApiError(400, 'Missing payout ID', 'MISSING_PAYOUT_ID')
    }

    const { data: payout, error: payoutError } = await adminClient
      .from('payouts')
      .select('*')
      .eq('id', payoutId)
      .maybeSingle()

    if (payoutError) throw payoutError
    if (!payout) {
      throw new ApiError(404, "We couldn't find that payout.", 'PAYOUT_NOT_FOUND')
    }

    if (payout.status !== 'pending_review') {
      throw new ApiError(
        409,
        `This payout has already been processed (status: ${payout.status}).`,
        'PAYOUT_NOT_REVIEWABLE'
      )
    }

    const { data: settings, error: settingsError } = await adminClient
      .from('builder_payout_settings')
      .select('payout_provider, recipient_details')
      .eq('auth_user_id', payout.user_id)
      .maybeSingle()

    if (settingsError) throw settingsError

    const providerName = settings?.payout_provider
    const recipientDetails = (settings?.recipient_details as Record<string, unknown> | null) ?? {}
    const provider = providerName ? getProvider(providerName) : undefined

    if (!providerName || !provider) {
      throw new ApiError(
        400,
        'This builder has not set up a payout method yet.',
        'NO_PAYOUT_METHOD'
      )
    }

    const validationErrors = provider.validate(recipientDetails)
    if (validationErrors.length > 0) {
      throw new ApiError(
        400,
        `Payout method is incomplete: ${validationErrors.join(', ')}`,
        'PAYOUT_METHOD_INCOMPLETE'
      )
    }

    let providerPayoutId: string | null = null
    let status: 'paid' | 'failed' = 'paid'
    let providerResponse: unknown = null
    let errorMessage: string | null = null

    try {
      const result = await provider.send({
        payoutId: payout.id,
        amountCents: payout.amount_cents,
        currency: 'usd',
        recipientDetails,
        reference: `Prism payout ${payout.id}`,
      })
      providerPayoutId = result.providerPayoutId
      providerResponse = result.response
    } catch (providerErr: any) {
      status = 'failed'
      errorMessage =
        providerErr?.message ??
        'The payment provider returned an error and the payout has been marked as failed.'
      console.error('Payout provider transfer failed:', providerErr)
    }

    const { error: updateError } = await adminClient
      .from('payouts')
      .update({
        status,
        provider: providerName,
        provider_payout_id: providerPayoutId,
        recipient_details: recipientDetails as any,
        provider_response: providerResponse as any,
        reviewed_at: new Date().toISOString(),
        reviewed_by: auth.user.id,
        paid_at: status === 'paid' ? new Date().toISOString() : null,
      })
      .eq('id', payoutId)

    if (updateError) throw updateError

    await logAudit({
      actorId: auth.user.id,
      actorEmail: auth.user.email ?? undefined,
      action: status === 'paid' ? 'payout.approve' : 'payout.approve_failed',
      targetType: 'payout',
      targetId: payout.id,
      metadata: {
        amountCents: payout.amount_cents,
        provider: providerName,
        providerPayoutId,
        error: errorMessage,
      },
      ipAddress: getClientIp(req),
    })

    if (status === 'paid') {
      sendPayoutPaidEmail(payout.user_id, payout.amount_cents).catch(() => {})
    } else {
      sendPayoutRejectedEmail(
        payout.user_id,
        payout.amount_cents,
        errorMessage ?? 'The payment provider could not process the transfer.'
      ).catch(() => {})
    }

    if (status === 'failed') {
      return NextResponse.json(
        {
          success: false,
          status,
          message:
            'Payout could not be sent. The payment provider returned an error and the payout has been marked as failed.',
          error: errorMessage,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Payout approved and sent.',
      status,
      provider: providerName,
      providerPayoutId,
    })
  } catch (err) {
    return handleApiError(err)
  }
}

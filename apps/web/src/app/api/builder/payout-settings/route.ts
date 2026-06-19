import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { handleApiError, ApiError, formatZodError } from '@/lib/api/errors'
import { getProvider } from '@/lib/payouts/providers'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const ProviderSchema = z.enum(['wise', 'payoneer', 'bank_transfer'])

const PayoutSettingsSchema = z.object({
  provider: ProviderSchema,
  recipientDetails: z.record(z.unknown()),
})

const SENSITIVE_FIELDS = new Set([
  'accountNumber',
  'iban',
  'sortCode',
  'routingNumber',
  'swiftBic',
])

function maskSensitiveDetails(details: Record<string, unknown> | null): Record<string, unknown> {
  if (!details) return {}
  const masked: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(details)) {
    if (SENSITIVE_FIELDS.has(key) && typeof value === 'string' && value.length > 4) {
      masked[key] = '•'.repeat(value.length - 4) + value.slice(-4)
    } else {
      masked[key] = value
    }
  }
  return masked
}

export async function GET() {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: settings } = await adminClient
      .from('builder_payout_settings')
      .select('payout_provider, recipient_details')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    return NextResponse.json({
      provider: settings?.payout_provider ?? null,
      recipientDetails: maskSensitiveDetails(
        (settings?.recipient_details as Record<string, unknown> | null) ?? {}
      ),
      masked: true,
    })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rawBody = await req.json()
    const parseResult = PayoutSettingsSchema.safeParse(rawBody)
    if (!parseResult.success) {
      const { message, details } = formatZodError(parseResult.error)
      throw new ApiError(400, message, 'INVALID_BODY', details)
    }

    const { provider, recipientDetails } = parseResult.data
    const payoutProvider = getProvider(provider)
    if (!payoutProvider) {
      throw new ApiError(400, 'Unsupported payout provider', 'INVALID_PROVIDER')
    }

    const validationErrors = payoutProvider.validate(recipientDetails)
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid recipient details', details: validationErrors },
        { status: 400 }
      )
    }

    const { data: existing } = await adminClient
      .from('builder_payout_settings')
      .select('id, recipient_details')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    // Merge with existing details so masked fields the user did not re-enter
    // are not overwritten with empty strings.
    const existingDetails =
      (existing?.recipient_details as Record<string, unknown> | null) ?? {}
    const mergedDetails: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(existingDetails)) {
      mergedDetails[key] = value
    }
    for (const [key, value] of Object.entries(recipientDetails)) {
      if (value !== undefined && value !== '' && !String(value).includes('•')) {
        mergedDetails[key] = value
      }
    }

    const upsertPayload = {
      auth_user_id: user.id,
      payout_provider: provider,
      recipient_details: mergedDetails as any,
      updated_at: new Date().toISOString(),
    }

    if (existing) {
      const { error } = await adminClient
        .from('builder_payout_settings')
        .update(upsertPayload)
        .eq('auth_user_id', user.id)
      if (error) throw error
    } else {
      const { error } = await adminClient
        .from('builder_payout_settings')
        .insert({
          ...upsertPayload,
          country: String(recipientDetails.country ?? 'US'),
          currency: String(recipientDetails.currency ?? 'usd'),
        })
      if (error) throw error
    }

    await logAudit({
      actorId: user.id,
      actorEmail: user.email ?? undefined,
      action: 'builder.payout_settings.updated',
      targetType: 'builder_payout_settings',
      targetId: user.id,
      metadata: { provider, recipientDetails },
    })

    return NextResponse.json({ success: true, provider })
  } catch (err) {
    return handleApiError(err)
  }
}

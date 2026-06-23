import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { stripe, STRIPE_PRICE_ID } from '@/lib/stripe'
import { RateLimiter, getClientIp, rateLimitResponse } from '@/lib/api/rate-limit'
import { handleApiError, ApiError, formatZodError } from '@/lib/api/errors'
import {
  getCountryCode,
  getCurrencyForCountry,
  getExchangeRate,
  convertLocalMinorUnitsToUsdCents,
  convertUsdCentsToLocal,
} from '@/lib/geo'

export const dynamic = 'force-dynamic'

const checkoutRateLimiter = new RateLimiter(20, 15 * 60 * 1000)

const CheckoutSchema = z.object({
  mode: z.enum(['subscription', 'payment']).optional(),
  uiMode: z.enum(['embedded', 'hosted']).optional(),
  amountCents: z.number().int().min(1000).max(10000000).optional(),
  amount: z.number().int().min(1).max(10000000).optional(),
  currency: z.string().length(3).optional(),
  // Opt-in only: when true, the card is saved for off-session auto top-ups.
  // Defaults to false so a top-up is a one-time charge with nothing stored.
  saveCard: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const clientIp = getClientIp(req)
    const rateLimitResult = await checkoutRateLimiter.check(`${user.id}:${clientIp}`)
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.limit, rateLimitResult.resetAt)
    }

    const { data: advertiser, error } = await supabase
      .from('advertisers')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Advertiser not found. Complete onboarding first.' },
          { status: 404 }
        )
      }
      throw error
    }

    const rawBody = await req.json()
    const parseResult = CheckoutSchema.safeParse(rawBody)
    if (!parseResult.success) {
      const { message, details } = formatZodError(parseResult.error)
      throw new ApiError(400, message, 'INVALID_BODY', details)
    }

    const { mode = 'payment', uiMode = 'hosted', amountCents, amount, currency: requestedCurrency, saveCard = false } = parseResult.data

    let customerId = advertiser.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: advertiser.email,
        name: advertiser.name,
        metadata: { advertiserId: advertiser.id },
      })
      customerId = customer.id
      await supabase
        .from('advertisers')
        .update({ stripe_customer_id: customerId })
        .eq('id', advertiser.id)
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://goprism.dev'

    if (mode === 'subscription') {
      if (!STRIPE_PRICE_ID) {
        return NextResponse.json(
          { error: 'Stripe price not configured' },
          { status: 500 }
        )
      }

      const checkout = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
        success_url: `${origin}/advertiser/dashboard?success=1`,
        cancel_url: `${origin}/advertiser/dashboard?canceled=1`,
        subscription_data: {
          metadata: { advertiserId: advertiser.id },
        },
      })

      return NextResponse.json({ url: checkout.url })
    }

    // Geo-based currency detection if client did not send a currency.
    const country = getCountryCode(req)
    const currency = requestedCurrency?.toLowerCase() ?? getCurrencyForCountry(country).toLowerCase()
    const rate = requestedCurrency && amount !== undefined
      ? await getExchangeRate(requestedCurrency)
      : await getExchangeRate(currency)

    let depositCents: number
    let baseUsdCents: number

    if (amount !== undefined && requestedCurrency) {
      depositCents = amount
      baseUsdCents = convertLocalMinorUnitsToUsdCents(amount, currency, rate)
    } else {
      baseUsdCents = amountCents ?? 1000
      depositCents = convertUsdCentsToLocal(baseUsdCents, currency, rate)
    }

    const isEmbedded = uiMode === 'embedded'
    const metadata = {
      advertiserId: advertiser.id,
      type: 'deposit',
      baseUsdCents: String(baseUsdCents),
      currency: currency.toUpperCase(),
      rate: String(rate),
      saveCard: String(saveCard),
    }

    let clientSecret: string | null = null
    let url: string | null = null

    if (isEmbedded) {
      const paymentIntent = await stripe.paymentIntents.create({
        customer: customerId,
        amount: depositCents,
        currency,
        automatic_payment_methods: { enabled: true },
        // Save the card for off-session auto top-ups ONLY when the advertiser
        // explicitly opted in. Default is a one-time charge that stores nothing.
        ...(saveCard ? { setup_future_usage: 'off_session' as const } : {}),
        description: 'Prism campaign budget deposit',
        metadata,
      })
      clientSecret = paymentIntent.client_secret
    } else {
      const checkout = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        payment_method_types: ['card', 'link'],
        // Save the card for off-session auto top-ups ONLY when opted in.
        ...(saveCard ? { payment_intent_data: { setup_future_usage: 'off_session' as const } } : {}),
        line_items: [
          {
            price_data: {
              currency,
              product_data: { name: 'Prism campaign budget deposit' },
              unit_amount: depositCents,
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/advertiser/dashboard?success=1`,
        cancel_url: `${origin}/advertiser/dashboard?canceled=1`,
        metadata,
      })
      url = checkout.url
    }

    return NextResponse.json({
      url,
      clientSecret,
      currency: currency.toUpperCase(),
      rate,
      baseUsdCents,
    })
  } catch (err) {
    return handleApiError(err)
  }
}

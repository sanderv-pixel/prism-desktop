import { NextResponse } from 'next/server'
import {
  getCountryCode,
  getCurrencyForCountry,
  fetchRates,
  convertUsdCentsToLocal,
} from '@/lib/geo'
import type { NextRequest } from 'next/server'

const BASE_MIN_USD_CENTS = 1000 // $10.00 USD

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const country = getCountryCode(req)
    const currency = getCurrencyForCountry(country)
    const rates = await fetchRates()
    const rate = rates[currency.toUpperCase()] || 1
    const minLocalAmount = convertUsdCentsToLocal(BASE_MIN_USD_CENTS, currency, rate)

    return NextResponse.json({
      country: country ?? null,
      currency,
      rate,
      baseMinUsdCents: BASE_MIN_USD_CENTS,
      minLocalAmount,
      rates: {
        USD: rates.USD ?? 1,
        EUR: rates.EUR ?? 1,
        AED: rates.AED ?? 1,
        [currency.toUpperCase()]: rate,
      },
    })
  } catch (err) {
    console.error('GET /api/geo/currency error:', err)
    return NextResponse.json(
      { country: null, currency: 'USD', rate: 1, baseMinUsdCents: BASE_MIN_USD_CENTS, minLocalAmount: BASE_MIN_USD_CENTS },
      { status: 500 }
    )
  }
}

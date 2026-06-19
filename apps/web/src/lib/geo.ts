import { NextRequest } from 'next/server'

const countryCurrencyMap: Record<string, string> = {
  US: 'USD',
  CA: 'CAD',
  GB: 'GBP',
  IE: 'EUR',
  DE: 'EUR',
  FR: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  PT: 'EUR',
  FI: 'EUR',
  GR: 'EUR',
  SK: 'EUR',
  SI: 'EUR',
  CY: 'EUR',
  MT: 'EUR',
  LU: 'EUR',
  EE: 'EUR',
  LV: 'EUR',
  LT: 'EUR',
  HR: 'EUR',
  BG: 'EUR',
  RO: 'EUR',
  HU: 'EUR',
  PL: 'EUR',
  CZ: 'EUR',
  DK: 'DKK',
  SE: 'SEK',
  NO: 'NOK',
  CH: 'CHF',
  IS: 'ISK',
  AE: 'AED',
  SA: 'SAR',
  QA: 'QAR',
  KW: 'KWD',
  BH: 'BHD',
  OM: 'OMR',
  JP: 'JPY',
  AU: 'AUD',
  NZ: 'NZD',
  SG: 'SGD',
  HK: 'HKD',
  MY: 'MYR',
  TH: 'THB',
  ID: 'IDR',
  PH: 'PHP',
  VN: 'VND',
  KR: 'KRW',
  TW: 'TWD',
  IN: 'INR',
  PK: 'PKR',
  BD: 'BDT',
  LK: 'LKR',
  NP: 'NPR',
  MX: 'MXN',
  BRL: 'BRL',
  AR: 'ARS',
  CL: 'CLP',
  CO: 'COP',
  PE: 'PEN',
  UY: 'UYU',
  ZA: 'ZAR',
  EG: 'EGP',
  NG: 'NGN',
  KE: 'KES',
  GH: 'GHS',
  UG: 'UGX',
  TZ: 'TZS',
  RW: 'RWF',
  MA: 'MAD',
  TN: 'TND',
  TR: 'TRY',
  IL: 'ILS',
  RU: 'RUB',
  CN: 'CNY',
}

export function getCountryCode(req: NextRequest): string | undefined {
  const vercelCountry = req.headers.get('x-vercel-ip-country')
  const cfCountry = req.headers.get('cf-ipcountry')
  const geoCountry = (req as any).geo?.country
  return vercelCountry || cfCountry || geoCountry || undefined
}

export function getCurrencyForCountry(countryCode?: string): string {
  if (!countryCode) return 'USD'
  return countryCurrencyMap[countryCode.toUpperCase()] || 'USD'
}

type RateCache = {
  rates: Record<string, number>
  fetchedAt: number
}

let rateCache: RateCache | null = null
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

export async function fetchRates(): Promise<Record<string, number>> {
  if (rateCache && Date.now() - rateCache.fetchedAt < CACHE_TTL_MS) {
    return rateCache.rates
  }

  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      next: { revalidate: 3600 },
    })
    if (!res.ok) throw new Error('Rate fetch failed')
    const data = (await res.json()) as { rates: Record<string, number> }
    rateCache = { rates: data.rates, fetchedAt: Date.now() }
    return data.rates
  } catch {
    // Fallback approximate rates so checkout doesn't break.
    return {
      USD: 1,
      AED: 3.67,
      EUR: 0.92,
      GBP: 0.79,
      CAD: 1.36,
      AUD: 1.52,
      JPY: 151,
      SGD: 1.35,
      CHF: 0.91,
      SAR: 3.75,
      QAR: 3.64,
      KWD: 0.31,
      BHD: 0.38,
      OMR: 0.38,
      DKK: 6.9,
      SEK: 10.7,
      NOK: 10.7,
      PLN: 4.0,
      CZK: 23.5,
      HUF: 365,
      RON: 4.6,
      BGN: 1.8,
      HRK: 6.9,
      ISK: 139,
      TRY: 32,
      ILS: 3.75,
      INR: 83.5,
      PKR: 278,
      BDT: 110,
      LKR: 300,
      NPR: 134,
      MXN: 17,
      BRL: 5.1,
      ARS: 880,
      CLP: 940,
      COP: 3900,
      PEN: 3.75,
      UYU: 39,
      ZAR: 18.8,
      EGP: 48,
      NGN: 1500,
      KES: 132,
      GHS: 15.5,
      UGX: 3900,
      TZS: 2600,
      RWF: 1300,
      MAD: 10.1,
      TND: 3.15,
      RUB: 92,
      CNY: 7.24,
      HKD: 7.83,
      MYR: 4.75,
      THB: 36.5,
      IDR: 16200,
      PHP: 56.5,
      VND: 25400,
      KRW: 1350,
      TWD: 32.2,
      NZD: 1.68,
    }
  }
}

export async function getExchangeRate(currency: string): Promise<number> {
  const rates = await fetchRates()
  return rates[currency.toUpperCase()] || 1
}

const ZERO_DECIMAL_CURRENCIES = ['JPY', 'VND', 'KRW', 'IDR', 'CLP', 'PYG', 'RWF']

function isZeroDecimal(currency: string): boolean {
  return ZERO_DECIMAL_CURRENCIES.includes(currency.toUpperCase())
}

export function convertUsdCentsToLocal(
  usdCents: number,
  currency: string,
  rate: number
): number {
  // For zero-decimal currencies, local "minor" units equal major units.
  const majorUsd = usdCents / 100
  const local = majorUsd * rate
  return Math.round(isZeroDecimal(currency) ? local : local * 100)
}

export function convertLocalMinorUnitsToUsdCents(
  localAmount: number,
  currency: string,
  rate: number
): number {
  const majorLocal = isZeroDecimal(currency) ? localAmount : localAmount / 100
  const usdMajor = majorLocal / rate
  return Math.round(usdMajor * 100)
}

export function formatCurrency(
  minorUnits: number,
  currency: string,
  locale = 'en'
): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
  })
  // Intl expects major units; minor units vary by currency.
  return formatter.format(isZeroDecimal(currency) ? minorUnits : minorUnits / 100)
}

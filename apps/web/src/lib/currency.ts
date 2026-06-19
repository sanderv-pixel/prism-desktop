export function isZeroDecimalCurrency(currency: string): boolean {
  return ['JPY', 'VND', 'KRW', 'IDR', 'CLP', 'PYG', 'RWF'].includes(
    currency.toUpperCase()
  )
}

export function minorUnitsToMajor(
  minorUnits: number,
  currency: string
): number {
  return isZeroDecimalCurrency(currency) ? minorUnits : minorUnits / 100
}

export function formatCurrency(
  minorUnits: number,
  currency: string,
  locale = 'en'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(minorUnitsToMajor(minorUnits, currency))
}

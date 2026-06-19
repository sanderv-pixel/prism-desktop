import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2024-04-10',
})

export const stripeTest = process.env.STRIPE_TEST_SECRET_KEY
  ? new Stripe(process.env.STRIPE_TEST_SECRET_KEY, {
      apiVersion: '2024-04-10',
    })
  : null

export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID ?? ''

export function toCents(dollars: number): number {
  return Math.round(dollars * 100)
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100
}

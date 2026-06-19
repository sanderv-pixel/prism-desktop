'use client'

import { useEffect, useRef, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Zap } from 'lucide-react'

interface PaymentElementCheckoutProps {
  clientSecret: string
  returnUrl: string
}

export function PaymentElementCheckout({ clientSecret, returnUrl }: PaymentElementCheckoutProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const stripeRef = useRef<any>(null)
  const elementsRef = useRef<any>(null)

  useEffect(() => {
    let mounted = true

    async function init() {
      const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      if (!publishableKey) {
        if (mounted) setError('Stripe is not configured.')
        return
      }

      try {
        const stripe = await loadStripe(publishableKey)
        if (!stripe || !mounted) return

        stripeRef.current = stripe
        const elements = stripe.elements({
          clientSecret,
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#7c3aed',
              colorBackground: '#ffffff',
              colorText: '#0f172a',
              colorDanger: '#ef4444',
              colorSuccess: '#10b981',
              fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
              spacingUnit: '4px',
              borderRadius: '10px',
            },
            rules: {
              '.Tab': {
                border: '1px solid #e2e8f0',
                boxShadow: 'none',
              },
              '.Tab--selected': {
                borderColor: '#7c3aed',
                boxShadow: '0 0 0 1.5px #7c3aed',
              },
              '.Input': {
                borderColor: '#e2e8f0',
                boxShadow: 'none',
              },
              '.Input:focus': {
                borderColor: '#7c3aed',
                boxShadow: '0 0 0 1px #7c3aed',
              },
              '.CheckboxInput--checked': {
                backgroundColor: '#7c3aed',
                borderColor: '#7c3aed',
              },
            },
          },
          loader: 'auto',
        })
        elementsRef.current = elements

        const paymentElement = elements.create('payment')

        if (containerRef.current) {
          paymentElement.mount(containerRef.current)
          paymentElement.on('ready', () => {
            if (mounted) setReady(true)
          })
          paymentElement.on('loaderror', (e: any) => {
            if (mounted) {
              setError(e?.message || 'Failed to load payment form.')
              setReady(true)
            }
          })
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load checkout.')
          setReady(true)
        }
      }
    }

    init()

    return () => {
      mounted = false
      if (elementsRef.current) {
        try {
          elementsRef.current.destroy()
        } catch {
          // ignore
        }
      }
    }
  }, [clientSecret])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripeRef.current || !elementsRef.current || submitting || !ready) return

    setSubmitting(true)
    setError(null)

    const { error: submitError, paymentIntent } = await stripeRef.current.confirmPayment({
      elements: elementsRef.current,
      confirmParams: { return_url: returnUrl },
    })

    if (submitError) {
      setError(submitError.message || 'Payment failed. Please try again.')
      setSubmitting(false)
      return
    }

    // For non-redirect payment methods (e.g. test cards), confirmPayment returns
    // the payment intent on success. Credit the wallet immediately, then redirect.
    if (paymentIntent?.id) {
      try {
        const verifyRes = await fetch('/api/checkout/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
        })
        const verifyData = await verifyRes.json()
        if (!verifyRes.ok) {
          setError(verifyData.error || 'Payment succeeded but wallet update failed.')
          setSubmitting(false)
          return
        }
      } catch (err) {
        setError('Payment succeeded but we could not update your wallet.')
        setSubmitting(false)
        return
      }
    }

    window.location.href = returnUrl
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative min-h-[220px]">
        {!ready && !error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap size={16} className="animate-pulse text-primary" />
              Loading payment form…
            </div>
          </div>
        )}
        <div ref={containerRef} />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !ready}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {submitting ? 'Processing…' : 'Pay now'}
      </button>
    </form>
  )
}

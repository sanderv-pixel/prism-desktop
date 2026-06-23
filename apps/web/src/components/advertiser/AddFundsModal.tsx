'use client'

import { useState, type CSSProperties } from 'react'
import { X, Check, ArrowLeft, ShieldCheck } from 'lucide-react'
import { PaymentElementCheckout } from '@/components/PaymentElementCheckout'

interface AddFundsModalProps {
  onClose: () => void
  /** Called after the wallet is successfully credited, to refresh balances. */
  onFunded?: () => void
}

const PRESETS = [25, 50, 100, 250]
const MIN_USD = 10

const card: CSSProperties = {
  width: '100%',
  maxWidth: 460,
  maxHeight: '90vh',
  overflowY: 'auto',
  background: '#0c0c14',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 18,
  padding: 28,
  position: 'relative',
  color: '#e6e8ee',
  fontFamily: 'Inter, system-ui, sans-serif',
}

export function AddFundsModal({ onClose, onFunded }: AddFundsModalProps) {
  const [step, setStep] = useState<'amount' | 'pay' | 'done'>('amount')
  const [amount, setAmount] = useState('50')
  const [saveCard, setSaveCard] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const usd = parseFloat(amount)
  const valid = !isNaN(usd) && usd >= MIN_USD

  async function startPayment() {
    if (!valid) {
      setError(`Minimum top-up is $${MIN_USD}.`)
      return
    }
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uiMode: 'embedded',
          amountCents: Math.round(usd * 100),
          saveCard,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.clientSecret) {
        throw new Error(data.error ?? 'Could not start the payment.')
      }
      setClientSecret(data.clientSecret)
      setStep('pay')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setCreating(false)
    }
  }

  async function handleSuccess() {
    // Opt-in only: enable automatic top-ups now that a card is on file.
    if (saveCard) {
      try {
        await fetch('/api/advertiser/auto-recharge', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: true }),
        })
      } catch {
        // Non-critical: the card is saved; auto top-up can be toggled in Billing.
      }
    }
    onFunded?.()
    setStep('done')
  }

  const returnUrl = typeof window !== 'undefined' ? window.location.href : '/advertiser/dashboard'

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2,2,8,0.66)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 70,
      }}
    >
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#9aa0ad', cursor: 'pointer' }}
        >
          <X size={18} />
        </button>

        {step === 'amount' && (
          <>
            <h3 style={{ fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 6 }}>Add funds</h3>
            <p style={{ fontSize: 13.5, color: '#9aa0ad', marginBottom: 20 }}>
              Top up your wallet. You only spend it on ads you run.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
              {PRESETS.map((p) => {
                const active = String(p) === amount
                return (
                  <button
                    key={p}
                    onClick={() => { setAmount(String(p)); setError('') }}
                    style={{
                      padding: '12px 0',
                      borderRadius: 11,
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: active ? '#fff' : '#cdd2dc',
                      background: active ? 'rgba(139,92,246,0.18)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${active ? '#8b5cf6' : 'rgba(255,255,255,0.1)'}`,
                    }}
                  >
                    ${p}
                  </button>
                )
              })}
            </div>

            <label style={{ display: 'block', fontSize: 12, color: '#9aa0ad', marginBottom: 6 }}>Or enter an amount</label>
            <div style={{ position: 'relative', marginBottom: 18 }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9aa0ad', fontSize: 15 }}>$</span>
              <input
                type="number"
                min={MIN_USD}
                step="1"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError('') }}
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 26px',
                  borderRadius: 11,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  color: '#fff',
                  fontSize: 15,
                  outline: 'none',
                }}
              />
            </div>

            <label
              style={{
                display: 'flex',
                gap: 11,
                alignItems: 'flex-start',
                padding: 14,
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                marginBottom: 18,
              }}
            >
              <input
                type="checkbox"
                checked={saveCard}
                onChange={(e) => setSaveCard(e.target.checked)}
                style={{ marginTop: 2, width: 16, height: 16, accentColor: '#8b5cf6', cursor: 'pointer' }}
              />
              <span style={{ fontSize: 13, color: '#cdd2dc', lineHeight: 1.5 }}>
                <b style={{ color: '#fff' }}>Save my card and auto top-up</b> when my balance runs low.
                <span style={{ display: 'block', color: '#8b8f9c', marginTop: 2 }}>
                  Off by default. This is the only way a card is stored. Change it anytime in Billing.
                </span>
              </span>
            </label>

            {error && (
              <div style={{ fontSize: 13, color: '#f87171', marginBottom: 14 }}>{error}</div>
            )}

            <button
              onClick={startPayment}
              disabled={creating || !valid}
              style={{
                width: '100%',
                padding: '13px 0',
                borderRadius: 12,
                fontSize: 14.5,
                fontWeight: 600,
                color: '#fff',
                background: valid ? '#8b5cf6' : 'rgba(139,92,246,0.4)',
                border: 'none',
                cursor: valid && !creating ? 'pointer' : 'not-allowed',
              }}
            >
              {creating ? 'Starting…' : valid ? `Continue to payment · $${usd.toFixed(2)}` : `Minimum $${MIN_USD}`}
            </button>

            <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11.5, color: '#6f7480', marginTop: 14 }}>
              <ShieldCheck size={13} /> Secured by Stripe. We never see your card number.
            </p>
          </>
        )}

        {step === 'pay' && clientSecret && (
          <>
            <button
              onClick={() => { setStep('amount'); setClientSecret(null) }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#9aa0ad', fontSize: 13, cursor: 'pointer', marginBottom: 14 }}
            >
              <ArrowLeft size={15} /> Back
            </button>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
              Add ${usd.toFixed(2)} to your wallet
            </h3>
            <p style={{ fontSize: 13, color: '#9aa0ad', marginBottom: 18 }}>
              {saveCard ? 'Your card will be saved for automatic top-ups.' : 'One-time charge. Nothing is stored.'}
            </p>
            <PaymentElementCheckout dark clientSecret={clientSecret} returnUrl={returnUrl} onSuccess={handleSuccess} />
          </>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(52,211,153,0.14)', color: '#6ee7b7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Check size={26} />
            </div>
            <h3 style={{ fontSize: 19, fontWeight: 600, color: '#fff', marginBottom: 6 }}>
              ${usd.toFixed(2)} added
            </h3>
            <p style={{ fontSize: 13.5, color: '#9aa0ad', marginBottom: 22 }}>
              Your balance is updated{saveCard ? ' and automatic top-ups are on.' : '.'} Ready to run campaigns.
            </p>
            <button
              onClick={onClose}
              style={{ width: '100%', padding: '12px 0', borderRadius: 12, fontSize: 14.5, fontWeight: 600, color: '#fff', background: '#8b5cf6', border: 'none', cursor: 'pointer' }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

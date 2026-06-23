'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/Button'
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
  Landmark,
  CreditCard,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import '@/components/dashboard/dashboard-dark.css'

type Provider = 'bank_transfer' | 'payoneer' | 'paypal'

const PROVIDERS: { id: Provider; label: string; desc: string; Icon: LucideIcon }[] = [
  { id: 'bank_transfer', label: 'Bank account', desc: 'Direct to your bank, encrypted and secure.', Icon: Landmark },
  { id: 'payoneer', label: 'Payoneer', desc: 'Receive to your Payoneer account or bank.', Icon: CreditCard },
  { id: 'paypal', label: 'PayPal', desc: 'Get paid to your PayPal balance by email.', Icon: Wallet },
]

const UI_PROVIDERS: Provider[] = ['bank_transfer', 'payoneer', 'paypal']

function isMasked(value: string): boolean {
  return value.includes('•')
}

interface PayoutMethodFormProps {
  /** Called after a successful save (page navigates, modal closes + refreshes). */
  onSaved?: () => void
}

/**
 * Reusable payout-method setup form. Rendered both on /dashboard/payout-method
 * and inside the dashboard "Set up payouts" modal. Token-based styling, so it
 * inherits the dark theme from its `.dash-dark` wrapper.
 */
export function PayoutMethodForm({ onSaved }: PayoutMethodFormProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [provider, setProvider] = useState<Provider>('bank_transfer')
  const [details, setDetails] = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/builder/payout-settings')
        if (!res.ok) throw new Error('Failed to load payout settings')
        const json = (await res.json()) as {
          provider: string | null
          recipientDetails: Record<string, unknown>
          masked?: boolean
        }
        // Only adopt providers that are still offered in the UI (legacy "wise"
        // accounts fall back to bank account).
        if (json.provider && UI_PROVIDERS.includes(json.provider as Provider)) {
          setProvider(json.provider as Provider)
        }
        const mapped = Object.fromEntries(
          Object.entries(json.recipientDetails).map(([k, v]) => [k, String(v ?? '')])
        )
        setDetails(mapped)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function updateField(key: string, value: string) {
    setDetails((prev) => ({ ...prev, [key]: value }))
  }

  function getFieldValue(key: string): string {
    return details[key] ?? ''
  }

  function getFieldProps(key: string) {
    const value = getFieldValue(key)
    if (isMasked(value)) {
      return { value: '', placeholder: value, onFocus: () => {} }
    }
    return { value, placeholder: undefined }
  }

  function buildBankTransferBody(): Record<string, unknown> {
    const country = details.country?.toUpperCase() || 'US'
    const currency = details.currency?.toUpperCase() || 'USD'
    const body: Record<string, unknown> = {
      accountHolderName: details.accountHolderName || undefined,
      currency,
      country,
    }

    if (country === 'US') {
      body.routingNumber = details.routingNumber || undefined
      body.accountNumber = details.accountNumber || undefined
      body.accountType = details.accountType || 'CHECKING'
      body.city = details.city || undefined
      body.state = details.state || undefined
      body.postCode = details.postCode || undefined
      body.addressLine = details.addressLine || undefined
    } else if (country === 'GB') {
      body.sortCode = details.sortCode || undefined
      body.accountNumber = details.accountNumber || undefined
    } else if (
      ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'].includes(country)
    ) {
      body.iban = details.iban || undefined
    } else {
      body.accountNumber = details.accountNumber || undefined
      body.swiftBic = details.swiftBic || undefined
    }

    return body
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      const body: Record<string, unknown> = { provider, recipientDetails: {} }

      if (provider === 'bank_transfer') {
        body.recipientDetails = buildBankTransferBody()
      } else if (provider === 'payoneer') {
        body.recipientDetails = { payoneerEmail: details.payoneerEmail }
      } else {
        body.recipientDetails = { paypalEmail: details.paypalEmail }
      }

      const res = await fetch('/api/builder/payout-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error + (json.details ? ` (${json.details.join(', ')})` : ''))
      }
      setSuccess(true)
      setTimeout(() => onSaved?.(), 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    )
  }

  const country = details.country?.toUpperCase() || 'US'
  const inputCls =
    'w-full rounded-lg border border-border bg-input px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40'
  const labelCls = 'block text-sm font-medium text-foreground mb-1'

  return (
    <>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 flex items-start gap-3 mb-5">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-600 flex items-start gap-3 mb-5">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <p className="text-sm">Payout method saved.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Payout method
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PROVIDERS.map(({ id, label, desc, Icon }) => {
              const selected = provider === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setProvider(id)
                    setDetails({})
                  }}
                  className={`relative rounded-xl border p-4 text-left transition ${
                    selected
                      ? 'border-primary bg-violet-50'
                      : 'border-border hover:border-primary/50 hover:bg-muted/40'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 transition ${
                      selected ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  <p className="font-medium text-foreground text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">{desc}</p>
                  {selected && (
                    <CheckCircle2 size={16} className="absolute top-3 right-3 text-primary" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {provider === 'bank_transfer' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-emerald-50 border border-emerald-100 p-4">
              <Shield size={18} className="text-emerald-600 mt-0.5 shrink-0" />
              <p className="text-sm text-emerald-700">
                Your bank details are sent over HTTPS and stored encrypted at rest. Only authorized
                admins can view full account numbers when processing a payout.
              </p>
            </div>

            <div>
              <label className={labelCls}>Account holder name</label>
              <input required value={getFieldValue('accountHolderName')} onChange={(e) => updateField('accountHolderName', e.target.value)} className={inputCls} placeholder="Full name on the account" />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Country</label>
                <select
                  required
                  value={country}
                  onChange={(e) => {
                    updateField('country', e.target.value)
                    setDetails((prev) => ({ ...prev, iban: '', sortCode: '', accountNumber: '', routingNumber: '', swiftBic: '' }))
                  }}
                  className={inputCls}
                >
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                  <option value="EU">European Union (IBAN)</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Currency</label>
                <input required value={getFieldValue('currency') || 'USD'} onChange={(e) => updateField('currency', e.target.value)} className={inputCls} placeholder="USD, EUR, GBP..." />
              </div>
            </div>

            {country === 'US' && (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Routing number</label>
                    <input required {...getFieldProps('routingNumber')} onChange={(e) => updateField('routingNumber', e.target.value)} className={inputCls} placeholder="9 digits" />
                  </div>
                  <div>
                    <label className={labelCls}>Account number</label>
                    <input required {...getFieldProps('accountNumber')} onChange={(e) => updateField('accountNumber', e.target.value)} className={inputCls} placeholder="Account number" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Account type</label>
                  <select value={getFieldValue('accountType') || 'CHECKING'} onChange={(e) => updateField('accountType', e.target.value)} className={inputCls}>
                    <option value="CHECKING">Checking</option>
                    <option value="SAVINGS">Savings</option>
                  </select>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>City</label>
                    <input value={getFieldValue('city')} onChange={(e) => updateField('city', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>State</label>
                    <input value={getFieldValue('state')} onChange={(e) => updateField('state', e.target.value)} className={inputCls} placeholder="NY" />
                  </div>
                  <div>
                    <label className={labelCls}>ZIP</label>
                    <input value={getFieldValue('postCode')} onChange={(e) => updateField('postCode', e.target.value)} className={inputCls} placeholder="10001" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Address line</label>
                  <input value={getFieldValue('addressLine')} onChange={(e) => updateField('addressLine', e.target.value)} className={inputCls} placeholder="1 Main St" />
                </div>
              </>
            )}

            {country === 'GB' && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Sort code</label>
                  <input required {...getFieldProps('sortCode')} onChange={(e) => updateField('sortCode', e.target.value)} className={inputCls} placeholder="12-34-56" />
                </div>
                <div>
                  <label className={labelCls}>Account number</label>
                  <input required {...getFieldProps('accountNumber')} onChange={(e) => updateField('accountNumber', e.target.value)} className={inputCls} placeholder="Account number" />
                </div>
              </div>
            )}

            {country === 'EU' && (
              <div>
                <label className={labelCls}>IBAN</label>
                <input required {...getFieldProps('iban')} onChange={(e) => updateField('iban', e.target.value)} className={inputCls} placeholder="IBAN" />
              </div>
            )}

            {country === 'OTHER' && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Account number</label>
                  <input required {...getFieldProps('accountNumber')} onChange={(e) => updateField('accountNumber', e.target.value)} className={inputCls} placeholder="Account number" />
                </div>
                <div>
                  <label className={labelCls}>SWIFT / BIC</label>
                  <input required {...getFieldProps('swiftBic')} onChange={(e) => updateField('swiftBic', e.target.value)} className={inputCls} placeholder="SWIFT/BIC" />
                </div>
              </div>
            )}
          </div>
        )}

        {provider === 'payoneer' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-violet-50 border border-violet-100 p-4">
              <CreditCard size={18} className="text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Payouts are sent to your Payoneer account by email. Use the email registered with
                Payoneer.
              </p>
            </div>
            <div>
              <label className={labelCls}>Payoneer email</label>
              <input required type="email" value={getFieldValue('payoneerEmail')} onChange={(e) => updateField('payoneerEmail', e.target.value)} className={inputCls} placeholder="email@example.com" />
            </div>
          </div>
        )}

        {provider === 'paypal' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-violet-50 border border-violet-100 p-4">
              <Wallet size={18} className="text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Payouts are sent to your PayPal balance by email. Make sure it matches your PayPal
                account.
              </p>
            </div>
            <div>
              <label className={labelCls}>PayPal email</label>
              <input required type="email" value={getFieldValue('paypalEmail')} onChange={(e) => updateField('paypalEmail', e.target.value)} className={inputCls} placeholder="email@example.com" />
            </div>
          </div>
        )}

        <Button type="submit" size="md" className="w-full" disabled={saving}>
          {saving ? 'Saving…' : 'Save payout method'}
        </Button>
      </form>
    </>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/Button'
import { AlertCircle, CheckCircle2, Loader2, Shield } from 'lucide-react'
import '@/components/dashboard/dashboard-dark.css'

type Provider = 'bank_transfer' | 'wise' | 'payoneer'

const PROVIDER_LABELS: Record<Provider, string> = {
  bank_transfer: 'Bank account',
  wise: 'Wise (bank transfer)',
  payoneer: 'Payoneer',
}

const PROVIDER_DESCRIPTIONS: Record<Provider, string> = {
  bank_transfer: 'Receive directly to your bank account. Your details are encrypted in transit and stored securely.',
  wise: 'Receive via Wise to your bank account.',
  payoneer: 'Receive to your Payoneer account or bank.',
}

function isMasked(value: string): boolean {
  return value.includes('•')
}

function maskPlaceholder(value: string): string {
  return value
}

interface PayoutMethodFormProps {
  /** Called after a successful save (page navigates, modal closes + refreshes). */
  onSaved?: () => void
}

/**
 * Reusable payout-method setup form. Same logic and fields as before; rendered
 * both on /dashboard/payout-method and inside the dashboard "Set up payouts"
 * modal. All token-based styling, so it inherits the dark theme from its
 * `.dash-dark` wrapper.
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
          provider: Provider | null
          recipientDetails: Record<string, unknown>
          masked?: boolean
        }
        if (json.provider) setProvider(json.provider)
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
      return { value: '', placeholder: maskPlaceholder(value), onFocus: () => {} }
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
      } else if (provider === 'wise') {
        body.recipientDetails = {
          accountHolderName: details.accountHolderName,
          currency: details.currency?.toUpperCase() || 'USD',
          country: details.country?.toUpperCase() || undefined,
          iban: details.iban || undefined,
          sortCode: details.sortCode || undefined,
          accountNumber: details.accountNumber || undefined,
          routingNumber: details.routingNumber || undefined,
          swiftBic: details.swiftBic || undefined,
          accountType: details.accountType || 'CHECKING',
          city: details.city || undefined,
          postCode: details.postCode || undefined,
          state: details.state || undefined,
          addressLine: details.addressLine || undefined,
        }
      } else {
        body.recipientDetails = { payoneerEmail: details.payoneerEmail }
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

  return (
    <>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 flex items-start gap-3 mb-5">
          <AlertCircle size={18} className="mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-600 flex items-start gap-3 mb-5">
          <CheckCircle2 size={18} className="mt-0.5" />
          <p className="text-sm">Payout method saved.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Payout provider</label>
          <div className="grid sm:grid-cols-3 gap-3">
            {(['bank_transfer', 'wise', 'payoneer'] as Provider[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setProvider(p)
                  setDetails({})
                }}
                className={`rounded-xl border p-4 text-left transition ${
                  provider === p ? 'border-primary bg-violet-50 text-primary' : 'border-border hover:border-primary/50'
                }`}
              >
                <p className="font-medium">{PROVIDER_LABELS[p]}</p>
                <p className="text-xs text-muted-foreground mt-1">{PROVIDER_DESCRIPTIONS[p]}</p>
              </button>
            ))}
          </div>
        </div>

        {provider === 'bank_transfer' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-emerald-50 border border-emerald-100 p-4">
              <Shield size={18} className="text-emerald-600 mt-0.5" />
              <p className="text-sm text-emerald-700">
                Your bank details are sent over HTTPS and stored encrypted at rest. Only authorized
                admins can view full account numbers when processing a payout.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Account holder name</label>
              <input required value={getFieldValue('accountHolderName')} onChange={(e) => updateField('accountHolderName', e.target.value)} className={inputCls} placeholder="Full name on the account" />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Country</label>
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
                <label className="block text-sm font-medium text-foreground mb-1">Currency</label>
                <input required value={getFieldValue('currency') || 'USD'} onChange={(e) => updateField('currency', e.target.value)} className={inputCls} placeholder="USD, EUR, GBP..." />
              </div>
            </div>

            {country === 'US' && (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Routing number</label>
                    <input required {...getFieldProps('routingNumber')} onChange={(e) => updateField('routingNumber', e.target.value)} className={inputCls} placeholder="9 digits" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Account number</label>
                    <input required {...getFieldProps('accountNumber')} onChange={(e) => updateField('accountNumber', e.target.value)} className={inputCls} placeholder="Account number" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Account type</label>
                  <select value={getFieldValue('accountType') || 'CHECKING'} onChange={(e) => updateField('accountType', e.target.value)} className={inputCls}>
                    <option value="CHECKING">Checking</option>
                    <option value="SAVINGS">Savings</option>
                  </select>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">City</label>
                    <input value={getFieldValue('city')} onChange={(e) => updateField('city', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">State</label>
                    <input value={getFieldValue('state')} onChange={(e) => updateField('state', e.target.value)} className={inputCls} placeholder="NY" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">ZIP</label>
                    <input value={getFieldValue('postCode')} onChange={(e) => updateField('postCode', e.target.value)} className={inputCls} placeholder="10001" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Address line</label>
                  <input value={getFieldValue('addressLine')} onChange={(e) => updateField('addressLine', e.target.value)} className={inputCls} placeholder="1 Main St" />
                </div>
              </>
            )}

            {country === 'GB' && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Sort code</label>
                  <input required {...getFieldProps('sortCode')} onChange={(e) => updateField('sortCode', e.target.value)} className={inputCls} placeholder="12-34-56" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Account number</label>
                  <input required {...getFieldProps('accountNumber')} onChange={(e) => updateField('accountNumber', e.target.value)} className={inputCls} placeholder="Account number" />
                </div>
              </div>
            )}

            {country === 'EU' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">IBAN</label>
                <input required {...getFieldProps('iban')} onChange={(e) => updateField('iban', e.target.value)} className={inputCls} placeholder="IBAN" />
              </div>
            )}

            {country === 'OTHER' && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Account number</label>
                  <input required {...getFieldProps('accountNumber')} onChange={(e) => updateField('accountNumber', e.target.value)} className={inputCls} placeholder="Account number" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">SWIFT / BIC</label>
                  <input required {...getFieldProps('swiftBic')} onChange={(e) => updateField('swiftBic', e.target.value)} className={inputCls} placeholder="SWIFT/BIC" />
                </div>
              </div>
            )}
          </div>
        )}

        {provider === 'wise' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Account holder name</label>
              <input required value={getFieldValue('accountHolderName')} onChange={(e) => updateField('accountHolderName', e.target.value)} className={inputCls} placeholder="Full name on the account" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Recipient currency</label>
                <input required value={getFieldValue('currency') || 'USD'} onChange={(e) => updateField('currency', e.target.value)} className={inputCls} placeholder="USD, EUR, GBP..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Country (optional)</label>
                <input value={getFieldValue('country')} onChange={(e) => updateField('country', e.target.value)} className={inputCls} placeholder="US, GB, DE..." />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">IBAN</label>
              <input value={getFieldValue('iban')} onChange={(e) => updateField('iban', e.target.value)} className={inputCls} placeholder="For EUR, GBP, most countries" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Account number</label>
                <input value={getFieldValue('accountNumber')} onChange={(e) => updateField('accountNumber', e.target.value)} className={inputCls} placeholder="Required if no IBAN" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Sort code</label>
                <input value={getFieldValue('sortCode')} onChange={(e) => updateField('sortCode', e.target.value)} className={inputCls} placeholder="UK / NZ etc." />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Routing number (USD)</label>
                <input value={getFieldValue('routingNumber')} onChange={(e) => updateField('routingNumber', e.target.value)} className={inputCls} placeholder="US ACH routing" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">SWIFT / BIC</label>
                <input value={getFieldValue('swiftBic')} onChange={(e) => updateField('swiftBic', e.target.value)} className={inputCls} placeholder="International wires" />
              </div>
            </div>
            {getFieldValue('currency')?.toUpperCase() === 'USD' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Account type</label>
                  <select value={getFieldValue('accountType') || 'CHECKING'} onChange={(e) => updateField('accountType', e.target.value)} className={inputCls}>
                    <option value="CHECKING">Checking</option>
                    <option value="SAVINGS">Savings</option>
                  </select>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">City</label>
                    <input value={getFieldValue('city')} onChange={(e) => updateField('city', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">State</label>
                    <input value={getFieldValue('state')} onChange={(e) => updateField('state', e.target.value)} className={inputCls} placeholder="NY" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">ZIP</label>
                    <input value={getFieldValue('postCode')} onChange={(e) => updateField('postCode', e.target.value)} className={inputCls} placeholder="10001" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Address line</label>
                  <input value={getFieldValue('addressLine')} onChange={(e) => updateField('addressLine', e.target.value)} className={inputCls} placeholder="1 Main St" />
                </div>
              </>
            )}
          </div>
        )}

        {provider === 'payoneer' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Payoneer email</label>
              <input required type="email" value={getFieldValue('payoneerEmail')} onChange={(e) => updateField('payoneerEmail', e.target.value)} className={inputCls} placeholder="email@example.com" />
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

import { randomUUID } from 'crypto'

export type PayoutRecipientDetails = Record<string, unknown>

export type PayoutSendArgs = {
  payoutId: string
  amountCents: number
  currency: string
  recipientDetails: PayoutRecipientDetails
  reference?: string
}

export type PayoutSendResult = {
  providerPayoutId: string
  response: unknown
}

export interface PayoutProvider {
  name: string
  validate(details: PayoutRecipientDetails): string[]
  send(args: PayoutSendArgs): Promise<PayoutSendResult>
}

function requiredString(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return 'required'
  }
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

async function wiseApi<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const token = process.env.WISE_API_TOKEN
  const baseUrl = process.env.WISE_API_URL || 'https://api.wise.com'
  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const text = await res.text()
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    json = text
  }

  if (!res.ok) {
    const message =
      typeof json === 'object' && json && 'message' in json
        ? String((json as { message?: unknown }).message)
        : String(json) || `Wise API error ${res.status}`
    throw new Error(message)
  }

  return json as T
}

function buildWiseRecipientPayload(
  profileId: string | number,
  currency: string,
  details: PayoutRecipientDetails
) {
  const accountHolderName = String(details.accountHolderName || '')
  const country = String(details.country || '')

  let type = ''
  const recipientDetails: Record<string, unknown> = {}

  if (details.iban) {
    type = 'iban'
    recipientDetails.iban = String(details.iban)
  } else if (details.sortCode && details.accountNumber) {
    type = 'sort_code'
    recipientDetails.sortCode = String(details.sortCode)
    recipientDetails.accountNumber = String(details.accountNumber)
  } else if (
    currency.toUpperCase() === 'USD' &&
    details.accountNumber &&
    details.routingNumber
  ) {
    type = 'aba'
    recipientDetails.accountNumber = String(details.accountNumber)
    recipientDetails.abartn = String(details.routingNumber)
    recipientDetails.accountType = String(details.accountType || 'CHECKING')
    recipientDetails.address = {
      city: String(details.city || 'New York'),
      country: 'US',
      postCode: String(details.postCode || '10001'),
      state: String(details.state || 'NY'),
      firstLine: String(details.addressLine || '1 Main St'),
    }
  } else if (details.accountNumber && details.swiftBic) {
    type = 'swift_code'
    recipientDetails.accountNumber = String(details.accountNumber)
    recipientDetails.swiftCode = String(details.swiftBic)
  } else {
    throw new Error(
      'Unsupported bank details for Wise. Provide IBAN, sort code + account number, or account number + routing number (USD), or account number + SWIFT/BIC.'
    )
  }

  return {
    currency: currency.toUpperCase(),
    type,
    profile: profileId,
    accountHolderName,
    ownedByCustomer: false,
    details: recipientDetails,
    ...(country ? { country } : {}),
  }
}

export const wiseProvider: PayoutProvider = {
  name: 'wise',

  validate(details) {
    const errors: string[] = []
    if (isProduction()) {
      if (!process.env.WISE_API_TOKEN) {
        errors.push('WISE_API_TOKEN is not configured')
      }
      if (!process.env.WISE_PROFILE_ID) {
        errors.push('WISE_PROFILE_ID is not configured')
      }
    }
    if (requiredString(details.accountHolderName)) {
      errors.push('Account holder name is required')
    }
    if (requiredString(details.currency)) {
      errors.push('Recipient currency is required')
    }
    const currency = String(details.currency || '').toUpperCase()
    const hasIban = !requiredString(details.iban)
    const hasSortCode = !requiredString(details.sortCode)
    const hasAccountNumber = !requiredString(details.accountNumber)
    const hasRouting = !requiredString(details.routingNumber)
    const hasSwift = !requiredString(details.swiftBic)

    if (
      !hasIban &&
      !(hasSortCode && hasAccountNumber) &&
      !(currency === 'USD' && hasAccountNumber && hasRouting) &&
      !(hasAccountNumber && hasSwift)
    ) {
      errors.push(
        'Provide IBAN, sort code + account number, account number + routing number (USD), or account number + SWIFT/BIC'
      )
    }
    return errors
  },

  async send({ payoutId, amountCents, recipientDetails, reference }) {
    const profileId = process.env.WISE_PROFILE_ID
    if (!profileId || !process.env.WISE_API_TOKEN) {
      throw new Error('Wise is not configured')
    }

    const targetCurrency = String(recipientDetails.currency || 'USD').toUpperCase()
    const sourceAmount = amountCents / 100

    const quote = await wiseApi<{
      id: string
      status: string
    }>('/v3/profiles/' + profileId + '/quotes', {
      method: 'POST',
      body: {
        sourceCurrency: 'USD',
        targetCurrency,
        sourceAmount,
        profile: profileId,
      },
    })

    let recipientId = recipientDetails.wiseRecipientId
      ? String(recipientDetails.wiseRecipientId)
      : undefined

    if (!recipientId) {
      const recipientPayload = buildWiseRecipientPayload(
        profileId,
        targetCurrency,
        recipientDetails
      )
      const recipient = await wiseApi<{ id: string }>('/v1/accounts', {
        method: 'POST',
        body: recipientPayload,
      })
      recipientId = recipient.id
    }

    const transfer = await wiseApi<{ id: string }>('/v1/transfers', {
      method: 'POST',
      body: {
        targetAccount: recipientId,
        quoteUuid: quote.id,
        customerTransactionId: payoutId,
        reference: reference || `Prism payout ${payoutId}`,
        details: {
          reference: reference || `Prism payout ${payoutId}`,
        },
      },
    })

    // Fund the transfer from the Wise multi-currency balance.
    const fundResponse = await wiseApi<{ status: string; errorCode?: string }>(
      `/v3/profiles/${profileId}/transfers/${transfer.id}/payments`,
      {
        method: 'POST',
        body: { type: 'BALANCE' },
      }
    )

    if (fundResponse.status === 'REJECTED' || fundResponse.errorCode) {
      throw new Error(
        `Wise funding failed: ${fundResponse.errorCode || fundResponse.status}`
      )
    }

    return {
      providerPayoutId: transfer.id,
      response: { quote, transfer, fund: fundResponse },
    }
  },
}

export const payoneerProvider: PayoutProvider = {
  name: 'payoneer',

  validate(details) {
    const errors: string[] = []
    if (!process.env.PAYONEER_CLIENT_ID || !process.env.PAYONEER_CLIENT_SECRET) {
      errors.push('Payoneer API credentials are not configured')
    }
    if (!process.env.PAYONEER_PROGRAM_ID) {
      errors.push('PAYONEER_PROGRAM_ID is not configured')
    }
    if (requiredString(details.payoneerEmail)) {
      errors.push('Payoneer email is required')
    }
    return errors
  },

  async send({ payoutId, amountCents, recipientDetails, reference }) {
    const clientId = process.env.PAYONEER_CLIENT_ID
    const clientSecret = process.env.PAYONEER_CLIENT_SECRET
    const programId = process.env.PAYONEER_PROGRAM_ID

    if (!clientId || !clientSecret || !programId) {
      throw new Error('Payoneer is not configured')
    }

    const tokenRes = await fetch('https://api.payoneer.com/v2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'read write',
      }).toString(),
    })

    if (!tokenRes.ok) {
      const text = await tokenRes.text()
      throw new Error(`Payoneer auth failed: ${text}`)
    }

    const tokenData = (await tokenRes.json()) as { access_token: string }

    const payoutRes = await fetch(
      `https://api.payoneer.com/v4/programs/${programId}/payouts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_reference_id: payoutId,
          payee_id: {
            type: 'email',
            value: String(recipientDetails.payoneerEmail),
          },
          amount: amountCents / 100,
          currency: 'USD',
          description: reference || `Prism payout ${payoutId}`,
        }),
      }
    )

    const payoutJson = (await payoutRes.json()) as {
      payout_id?: string
      error?: { message?: string }
    }

    if (!payoutRes.ok) {
      throw new Error(
        `Payoneer payout failed: ${payoutJson.error?.message || JSON.stringify(payoutJson)}`
      )
    }

    if (!payoutJson.payout_id) {
      throw new Error('Payoneer did not return a payout ID')
    }

    return {
      providerPayoutId: payoutJson.payout_id,
      response: payoutJson,
    }
  },
}

// Bank transfer provider: users enter plain bank account details; on the backend
// we map them to Wise recipient details and send the transfer via Wise.
export const bankTransferProvider: PayoutProvider = {
  name: 'bank_transfer',

  validate(details) {
    const errors: string[] = []
    const currency = String(details.currency || '').toUpperCase()
    const country = String(details.country || '').toUpperCase()

    if (isProduction()) {
      if (!process.env.WISE_API_TOKEN) {
        errors.push('WISE_API_TOKEN is not configured')
      }
      if (!process.env.WISE_PROFILE_ID) {
        errors.push('WISE_PROFILE_ID is not configured')
      }
    }
    if (requiredString(details.accountHolderName)) {
      errors.push('Account holder name is required')
    }
    if (!currency) {
      errors.push('Recipient currency is required')
    }
    if (!country) {
      errors.push('Recipient country is required')
    }

    const hasIban = !requiredString(details.iban)
    const hasSortCode = !requiredString(details.sortCode)
    const hasAccountNumber = !requiredString(details.accountNumber)
    const hasRouting = !requiredString(details.routingNumber)
    const hasSwift = !requiredString(details.swiftBic)

    if (
      !hasIban &&
      !(hasSortCode && hasAccountNumber) &&
      !(country === 'US' && hasAccountNumber && hasRouting) &&
      !(hasAccountNumber && hasSwift)
    ) {
      errors.push(
        'Provide IBAN, sort code + account number, US account number + routing number, or account number + SWIFT/BIC'
      )
    }

    if (country === 'US') {
      if (!hasRouting) errors.push('US routing number is required')
      if (!hasAccountNumber) errors.push('US account number is required')
    }

    return errors
  },

  async send(args) {
    const details = args.recipientDetails
    const currency = String(details.currency || 'USD').toUpperCase()
    const country = String(details.country || '').toUpperCase()

    // Build a Wise-compatible recipient details payload.
    const wiseDetails: Record<string, unknown> = {
      accountHolderName: details.accountHolderName,
      currency,
      country,
    }

    if (details.iban) {
      wiseDetails.iban = String(details.iban)
    } else if (details.sortCode && details.accountNumber) {
      wiseDetails.sortCode = String(details.sortCode)
      wiseDetails.accountNumber = String(details.accountNumber)
    } else if (country === 'US' && details.accountNumber && details.routingNumber) {
      wiseDetails.accountNumber = String(details.accountNumber)
      wiseDetails.routingNumber = String(details.routingNumber)
      wiseDetails.accountType = String(details.accountType || 'CHECKING')
      wiseDetails.city = String(details.city || 'New York')
      wiseDetails.postCode = String(details.postCode || '10001')
      wiseDetails.state = String(details.state || 'NY')
      wiseDetails.addressLine = String(details.addressLine || '1 Main St')
    } else if (details.accountNumber && details.swiftBic) {
      wiseDetails.accountNumber = String(details.accountNumber)
      wiseDetails.swiftBic = String(details.swiftBic)
    }

    return wiseProvider.send({
      ...args,
      recipientDetails: wiseDetails,
    })
  },
}

export const payoutProviders: Record<string, PayoutProvider> = {
  wise: wiseProvider,
  payoneer: payoneerProvider,
  bank_transfer: bankTransferProvider,
}

export function getProvider(name?: string | null): PayoutProvider | undefined {
  if (!name) return undefined
  return payoutProviders[name.toLowerCase()]
}

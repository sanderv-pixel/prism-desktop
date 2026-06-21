import { describe, it } from 'node:test'
import assert from 'node:assert'
import { wiseProvider } from './providers'

// Money-path guard: USD ACH payouts must carry a complete recipient address (the
// fake '1 Main St' fallback was removed). These run without network access.
describe('wiseProvider.validate', () => {
  it('rejects a USD ACH recipient with no address', () => {
    const errors = wiseProvider.validate({
      accountHolderName: 'Jane Doe',
      currency: 'USD',
      accountNumber: '12345678',
      routingNumber: '021000021',
    })
    assert.ok(
      errors.some((e) => /address/i.test(e)),
      `expected an address error, got: ${JSON.stringify(errors)}`
    )
  })

  it('accepts a USD ACH recipient with a complete address', () => {
    const errors = wiseProvider.validate({
      accountHolderName: 'Jane Doe',
      currency: 'USD',
      accountNumber: '12345678',
      routingNumber: '021000021',
      addressLine: '500 Market St',
      city: 'San Francisco',
      state: 'CA',
      postCode: '94105',
    })
    assert.deepEqual(errors, [])
  })

  it('does not require a US address for an IBAN recipient', () => {
    const errors = wiseProvider.validate({
      accountHolderName: 'Jane Doe',
      currency: 'EUR',
      iban: 'DE89370400440532013000',
    })
    assert.deepEqual(errors, [])
  })

  it('flags missing bank details entirely', () => {
    const errors = wiseProvider.validate({
      accountHolderName: 'Jane Doe',
      currency: 'USD',
    })
    assert.ok(errors.length > 0)
  })
})

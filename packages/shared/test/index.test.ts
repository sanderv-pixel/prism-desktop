import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  buildApiUrl,
  isValidAdPayload,
} from '../src/index'

describe('buildApiUrl', () => {
  it('joins base and path without double slashes', () => {
    assert.strictEqual(
      buildApiUrl('http://localhost:3000/api', 'ads'),
      'http://localhost:3000/api/ads'
    )
    assert.strictEqual(
      buildApiUrl('http://localhost:3000/api/', '/ads'),
      'http://localhost:3000/api/ads'
    )
  })
})

describe('isValidAdPayload', () => {
  it('accepts a valid payload', () => {
    assert.strictEqual(
      isValidAdPayload({
        id: 'ad-1',
        copy: 'Hello',
        url: 'https://example.com',
        advertiserName: 'Example',
      }),
      true
    )
  })

  it('rejects missing fields', () => {
    assert.strictEqual(isValidAdPayload({ id: 'ad-1' }), false)
    assert.strictEqual(
      isValidAdPayload({
        id: '',
        copy: 'Hello',
        url: 'https://example.com',
        advertiserName: 'Example',
      }),
      false
    )
  })
})



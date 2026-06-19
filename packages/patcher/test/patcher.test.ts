import { describe, it } from 'node:test'
import assert from 'node:assert'
import { patchPanel, restorePanel } from '../src/index'

describe('patcher', () => {
  it('exports patchPanel and restorePanel functions', () => {
    assert.strictEqual(typeof patchPanel, 'function')
    assert.strictEqual(typeof restorePanel, 'function')
  })
})

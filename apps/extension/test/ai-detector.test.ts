import { describe, it } from 'node:test'
import assert from 'node:assert'
import { detectToolFromEnv } from '../src/tool-detector'

describe('detectToolFromEnv', () => {
  it('detects Cursor from appName', () => {
    assert.strictEqual(detectToolFromEnv({ appName: 'Cursor' }), 'cursor-tab')
    assert.strictEqual(detectToolFromEnv({ appName: 'Cursor Nightly' }), 'cursor-tab')
  })

  it('detects Cursor from appHost', () => {
    assert.strictEqual(detectToolFromEnv({ appHost: 'cursor' }), 'cursor-tab')
  })

  it('defaults to copilot for VS Code', () => {
    assert.strictEqual(detectToolFromEnv({ appName: 'Visual Studio Code' }), 'copilot')
    assert.strictEqual(detectToolFromEnv({}), 'copilot')
  })
})

import { describe, it, afterEach } from 'node:test'
import assert from 'node:assert'
import {
  isHeartbeatEnforced,
  isHeartbeatShadow,
  isDevicePohEnforced,
  maxDevicesPerAccount,
} from './env'

const KEYS = [
  'PRISM_HEARTBEAT_ENFORCED',
  'PRISM_HEARTBEAT_SHADOW',
  'PRISM_DEVICE_POH_ENFORCED',
  'MAX_DEVICES_PER_ACCOUNT',
]

function clear() {
  for (const k of KEYS) delete process.env[k]
}

describe('anti-bot feature flags', () => {
  afterEach(clear)

  it('default to today behavior: nothing enforced, shadow on, cap 5', () => {
    clear()
    assert.equal(isHeartbeatEnforced(), false)
    assert.equal(isDevicePohEnforced(), false)
    assert.equal(isHeartbeatShadow(), true) // shadow on while enforcement is off
    assert.equal(maxDevicesPerAccount(), 5)
  })

  it('enforcing heartbeat turns shadow off by default', () => {
    clear()
    process.env.PRISM_HEARTBEAT_ENFORCED = 'true'
    assert.equal(isHeartbeatEnforced(), true)
    assert.equal(isHeartbeatShadow(), false)
  })

  it('shadow can be forced on even while enforcing', () => {
    clear()
    process.env.PRISM_HEARTBEAT_ENFORCED = 'true'
    process.env.PRISM_HEARTBEAT_SHADOW = 'true'
    assert.equal(isHeartbeatShadow(), true)
  })

  it('PoH flag and device cap read from env', () => {
    clear()
    process.env.PRISM_DEVICE_POH_ENFORCED = 'true'
    process.env.MAX_DEVICES_PER_ACCOUNT = '3'
    assert.equal(isDevicePohEnforced(), true)
    assert.equal(maxDevicesPerAccount(), 3)
  })

  it('falls back to cap 5 on a bad value', () => {
    clear()
    process.env.MAX_DEVICES_PER_ACCOUNT = 'nope'
    assert.equal(maxDevicesPerAccount(), 5)
  })
})

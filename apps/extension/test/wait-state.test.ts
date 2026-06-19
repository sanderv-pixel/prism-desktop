import { describe, it } from 'node:test'
import assert from 'node:assert'
import { evaluateWaitState } from '../src/wait-state'

describe('evaluateWaitState', () => {
  const base = {
    now: 10000,
    lastAICommandUntil: 0,
    terminalCommandsRunning: 0,
    lastLargeInsertionTime: 0,
    recentChanges: [] as Array<{ time: number; chars: number }>,
    aiPanelVisible: false,
    tool: 'copilot' as const,
    language: 'typescript',
  }

  it('returns none when no signals present', () => {
    const state = evaluateWaitState(base)
    assert.strictEqual(state.waiting, false)
    assert.strictEqual(state.reason, 'none')
  })

  it('detects AI command invocation', () => {
    const state = evaluateWaitState({
      ...base,
      lastAICommandUntil: 11000,
    })
    assert.strictEqual(state.waiting, true)
    assert.strictEqual(state.reason, 'ai-command-invoked')
  })

  it('detects terminal command running', () => {
    const state = evaluateWaitState({
      ...base,
      terminalCommandsRunning: 1,
    })
    assert.strictEqual(state.waiting, true)
    assert.strictEqual(state.reason, 'terminal-command')
  })

  it('detects large insertion', () => {
    const state = evaluateWaitState({
      ...base,
      lastLargeInsertionTime: 9900,
    })
    assert.strictEqual(state.waiting, true)
    assert.strictEqual(state.reason, 'large-insertion')
  })

  it('detects typing burst', () => {
    const state = evaluateWaitState({
      ...base,
      recentChanges: [
        { time: 9500, chars: 1 },
        { time: 9600, chars: 1 },
        { time: 9700, chars: 1 },
      ],
    })
    assert.strictEqual(state.waiting, true)
    assert.strictEqual(state.reason, 'typing-burst')
  })

  it('does not detect typing burst when last change is too old', () => {
    const state = evaluateWaitState({
      ...base,
      recentChanges: [
        { time: 7600, chars: 1 },
        { time: 7700, chars: 1 },
        { time: 7800, chars: 1 },
      ],
    })
    assert.strictEqual(state.waiting, false)
  })

  it('detects AI panel visible', () => {
    const state = evaluateWaitState({
      ...base,
      aiPanelVisible: true,
    })
    assert.strictEqual(state.waiting, true)
    assert.strictEqual(state.reason, 'ai-panel-visible')
  })

  it('prioritizes AI command over typing burst', () => {
    const state = evaluateWaitState({
      ...base,
      lastAICommandUntil: 11000,
      recentChanges: [{ time: 9900, chars: 1 }],
    })
    assert.strictEqual(state.reason, 'ai-command-invoked')
  })
})

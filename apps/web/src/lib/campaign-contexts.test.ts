import { describe, it } from 'node:test'
import assert from 'node:assert'
import { matchesContexts, groupContexts, describeMatch, TAG_AXIS } from './campaign-contexts'

describe('matchesContexts', () => {
  it('serves everywhere when no contexts are set (broad reach)', () => {
    assert.strictEqual(matchesContexts(['cursor', 'react'], []), true)
    assert.strictEqual(matchesContexts([], []), true)
  })

  it('matches with OR inside a single axis', () => {
    // surface axis: cursor OR vscode
    assert.strictEqual(matchesContexts(['cursor'], ['cursor', 'vscode']), true)
    assert.strictEqual(matchesContexts(['vscode'], ['cursor', 'vscode']), true)
    assert.strictEqual(matchesContexts(['claude'], ['cursor', 'vscode']), false)
  })

  it('requires AND across axes', () => {
    // surface=cursor AND stack=react
    const contexts = ['cursor', 'react']
    assert.strictEqual(matchesContexts(['cursor', 'react'], contexts), true)
    assert.strictEqual(matchesContexts(['cursor', 'vue'], contexts), false) // wrong stack
    assert.strictEqual(matchesContexts(['vscode', 'react'], contexts), false) // wrong surface
    assert.strictEqual(matchesContexts(['cursor'], contexts), false) // missing stack axis
  })

  it('is case-insensitive on signals', () => {
    assert.strictEqual(matchesContexts(['Cursor', 'React'], ['cursor', 'react']), true)
  })

  it('does not treat "general" as a serve-everywhere override anymore', () => {
    // general is a normal audience tag; a request without it must not match.
    assert.strictEqual(matchesContexts(['cursor'], ['general']), false)
    assert.strictEqual(matchesContexts(['general'], ['general']), true)
  })
})

describe('groupContexts', () => {
  it('splits tags by axis and treats unknown tags as stack', () => {
    const g = groupContexts(['cursor', 'founders', 'react', 'totally-unknown'])
    assert.deepStrictEqual(g.surface, ['cursor'])
    assert.deepStrictEqual(g.audience, ['founders'])
    assert.deepStrictEqual(g.stack, ['react', 'totally-unknown'])
  })
})

describe('TAG_AXIS', () => {
  it('maps representative tags to the right axis', () => {
    assert.strictEqual(TAG_AXIS['claude'], 'surface')
    assert.strictEqual(TAG_AXIS['founders'], 'audience')
    assert.strictEqual(TAG_AXIS['stripe'], 'stack')
  })
})

describe('describeMatch', () => {
  it('describes broad reach and grouped selections', () => {
    assert.match(describeMatch([]), /broad reach/i)
    assert.strictEqual(describeMatch(['cursor', 'react']), 'Shows on cursor, using react.')
  })
})

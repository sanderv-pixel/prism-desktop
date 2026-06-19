import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3005'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase env vars')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const testRun = `e2e-${Date.now()}`
const testUserId = `${testRun}-user`
const testSessionId = `${testRun}-session`
const testContext = 'typescript'

let userId: string
let advertiserId: string
let campaignId: string
let impressionToken: string
let clickUrl: string

async function cleanup() {
  if (campaignId) {
    await supabase.from('impressions').delete().eq('campaign_id', campaignId)
    await supabase.from('clicks').delete().eq('campaign_id', campaignId)
    await supabase.from('conversions').delete().eq('campaign_id', campaignId)
    await supabase.from('campaigns').delete().eq('id', campaignId)
  }
  if (advertiserId) {
    await supabase.from('advertisers').delete().eq('id', advertiserId)
  }
  await supabase.from('audit_logs').delete().eq('target_id', campaignId)
  await supabase.from('anomaly_events').delete().filter('details->>campaignId', 'eq', campaignId)
  if (userId) {
    await supabase.auth.admin.deleteUser(userId)
  }
}

describe('Prism ad serving end-to-end', () => {
  before(async () => {
    await cleanup()

    const { data: user, error: userError } = await supabase.auth.admin.createUser({
      email: `${testRun}@prism.test`,
      password: 'TestPassword123!',
      email_confirm: true,
    })
    if (userError || !user) {
      throw new Error(`Failed to create auth user: ${userError?.message}`)
    }
    userId = user.user.id

    const { data: advertiser, error: advertiserError } = await supabase
      .from('advertisers')
      .insert({
        name: `${testRun} Advertiser`,
        email: `${testRun}@prism.test`,
        user_id: userId,
        status: 'active',
        subscription_status: 'active',
        website: 'https://prism.test',
      })
      .select()
      .single()

    if (advertiserError || !advertiser) {
      throw new Error(`Failed to seed advertiser: ${advertiserError?.message}`)
    }
    advertiserId = advertiser.id

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        advertiser_id: advertiserId,
        title: `${testRun} Campaign`,
        copy: 'Try Prism today - the best way to reach AI builders.',
        url: 'https://prism.test/landing',
        objective: 'awareness',
        bid_type: 'cpm',
        max_bid_cpm: 2000, // $20 CPM
        budget_cents: 100_000, // $1,000
        spent_cents: 0,
        status: 'active',
        contexts: ['typescript', 'general-ai'],
      })
      .select()
      .single()

    if (campaignError || !campaign) {
      throw new Error(`Failed to seed campaign: ${campaignError?.message}`)
    }
    campaignId = campaign.id
  })

  after(async () => {
    await cleanup()
  })

  test('fetches an active ad from /api/ads', async () => {
    const res = await fetch(`${BASE_URL}/api/ads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        sessionId: testSessionId,
        context: {
          editor: 'vscode',
          language: 'typescript',
          projectType: 'saas',
          aiTool: 'copilot',
        },
      }),
    })

    const text = await res.text()
    assert.equal(res.status, 200, `Expected 200, got ${res.status}: ${text}`)
    const ad = JSON.parse(text)
    assert.ok(ad, 'Ad payload should not be empty')
    assert.ok(ad.id, 'Ad should have an id')
    assert.ok(ad.copy, 'Ad should have copy')
    assert.ok(ad.url, 'Ad should have url')
    assert.ok(ad.clickUrl, 'Ad should have clickUrl')
    assert.ok(ad.impressionToken, 'Ad should have impressionToken')
    assert.ok(ad.advertiserName, 'Ad should have advertiserName')

    impressionToken = ad.impressionToken
    clickUrl = ad.clickUrl
  })

  test('records a validated impression via /api/impressions', async () => {
    const res = await fetch(`${BASE_URL}/api/impressions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        campaignId,
        impressionToken,
        context: { editor: 'vscode', language: 'typescript' },
        durationMs: 2000,
      }),
    })

    const text = await res.text()
    assert.equal(res.status, 200, `Expected 200, got ${res.status}: ${text}`)
    const body = JSON.parse(text)
    assert.equal(body.ok, true)
    assert.equal(body.validated, true, 'Impression should be validated')
    assert.ok(body.payoutCents > 0, 'Payout should be positive')

    const { data: impression, error } = await supabase
      .from('impressions')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('session_id', testSessionId)
      .single()

    assert.ifError(error)
    assert.ok(impression, 'Impression row should exist')
    assert.equal(impression.validated, true)
    assert.equal(impression.campaign_id, campaignId)
    assert.equal(impression.session_id, testSessionId)
    assert.ok(impression.client_ip, 'client_ip should be logged')
    assert.ok(impression.context_hash, 'context_hash should be logged')
    assert.equal(typeof impression.fraud_score, 'number')
  })

  test('records a click via /api/clicks and redirects', async () => {
    const res = await fetch(`${BASE_URL}/api/clicks?t=${encodeURIComponent(impressionToken)}`, {
      method: 'GET',
      redirect: 'manual',
    })

    const text = await res.text()
    assert.equal(res.status, 302, `Expected 302 redirect, got ${res.status}: ${text}`)
    const location = res.headers.get('location')
    assert.equal(location, 'https://prism.test/landing')

    const { data: click, error } = await supabase
      .from('clicks')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('session_id', testSessionId)
      .single()

    assert.ifError(error)
    assert.ok(click, 'Click row should exist')
    assert.equal(click.campaign_id, campaignId)
    assert.equal(click.redirected, true)
  })

  test('campaign budget is decremented after impression', async () => {
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('spent_cents')
      .eq('id', campaignId)
      .single()

    assert.ifError(error)
    assert.ok(campaign, 'Campaign should still exist')
    assert.ok(campaign.spent_cents > 0, 'spent_cents should have increased')
  })
})

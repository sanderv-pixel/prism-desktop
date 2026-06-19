#!/usr/bin/env node
// Automated pre-production smoke test for Prism.
//
// Run from the monorepo root:
//   node apps/web/scripts/preprod-test.mjs
//
// Required env vars:
//   NEXT_PUBLIC_SUPABASE_URL   (or SUPABASE_URL)
//   NEXT_PUBLIC_SUPABASE_ANON_KEY
//   SUPABASE_SERVICE_ROLE_KEY
//
// Optional env vars:
//   TEST_BASE_URL              default: https://goprism.dev
//   PRISM_API_KEY              global API key to bootstrap per-device keys
//   STRIPE_TEST_SECRET_KEY     needed for advertiser test-deposit flow
//   PRISM_ADMIN_EMAIL          existing admin email (must be in PRISM_ADMIN_EMAILS)
//   PRISM_ADMIN_PASSWORD       password for that admin account
//   PRISM_ADMIN_SECRET         value of PRISM_ADMIN_SECRET
//   TEST_CLEANUP=1             delete all test data at the end

import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const BASE_URL = (process.env.TEST_BASE_URL || 'https://goprism.dev').replace(/\/$/, '')
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PRISM_API_KEY = process.env.PRISM_API_KEY
const STRIPE_TEST_SECRET_KEY = process.env.STRIPE_TEST_SECRET_KEY
const ADMIN_EMAIL = process.env.PRISM_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.PRISM_ADMIN_PASSWORD
const ADMIN_SECRET = process.env.PRISM_ADMIN_SECRET
const DEVICE_API_KEY = process.env.PRISM_DEVICE_API_KEY
const CLEANUP = process.env.TEST_CLEANUP === '1'

const RUN_ID = Date.now()
const CREATOR_EMAIL = `prism-test-creator-${RUN_ID}@goprism.dev`
const ADVERTISER_EMAIL = `prism-test-advertiser-${RUN_ID}@goprism.dev`
const REFERRED_EMAIL = `prism-test-referred-${RUN_ID}@goprism.dev`
const TEST_PASSWORD = 'PrismTestPass123!'

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
}

function log(level, ...args) {
  const color = level === 'ok' ? COLORS.green : level === 'fail' ? COLORS.red : level === 'warn' ? COLORS.yellow : COLORS.blue
  console.log(color, ...args, COLORS.reset)
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`)
  }
}

function assertTrue(value, message) {
  if (!value) {
    throw new Error(message)
  }
}

let failed = false
function markFail(err) {
  failed = true
  log('fail', `✖ ${err.message}`)
  if (err.stack) console.error(COLORS.dim + err.stack + COLORS.reset)
}

function getProjectRef(url) {
  try {
    return new URL(url).hostname.split('.')[0]
  } catch {
    return 'project'
  }
}

const PROJECT_REF = getProjectRef(SUPABASE_URL || '')
const AUTH_COOKIE_NAME = `sb-${PROJECT_REF}-auth-token`

class Tester {
  constructor() {
    this.cookies = {}
    this.context = {
      creatorId: null,
      advertiserId: null,
      referredId: null,
      adminId: null,
      adminCreated: false,
      advertiserRecordId: null,
      campaignId: null,
      pendingCampaignId: null,
      deviceApiKey: null,
      impressionToken: null,
      conversionToken: null,
      clickUrl: null,
      sessionId: null,
      winnerCampaignId: null,
    }
  }

  setAuthCookie(session) {
    if (!session) throw new Error('No session returned from sign-in')
    const value = encodeURIComponent(JSON.stringify(session))
    this.cookies[AUTH_COOKIE_NAME] = value
  }

  clearCookies() {
    this.cookies = {}
  }

  cookieHeader() {
    return Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ')
  }

  parseSetCookie(res) {
    const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : res.headers.get('set-cookie')
    if (!raw) return
    const values = Array.isArray(raw) ? raw : [raw]
    for (const v of values) {
      const [kv] = v.split(';')
      const idx = kv.indexOf('=')
      if (idx <= 0) continue
      const name = kv.slice(0, idx).trim()
      const value = kv.slice(idx + 1).trim()
      this.cookies[name] = value
    }
  }

  async req(path, opts = {}) {
    const url = path.startsWith('http') ? path : `${BASE_URL}${path}`
    const headers = { ...(opts.headers || {}) }
    const cookieHeader = this.cookieHeader()
    if (cookieHeader) headers.Cookie = cookieHeader

    if (opts.body && typeof opts.body === 'object' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
      opts.body = JSON.stringify(opts.body)
    }

    const res = await fetch(url, { ...opts, headers })
    this.parseSetCookie(res)

    const text = await res.text()
    let json
    try {
      json = JSON.parse(text)
    } catch {
      json = undefined
    }

    return { status: res.status, ok: res.ok, json, text, headers: res.headers }
  }

  async ensureUser(email, password) {
    const { data: listData, error: listErr } = await admin.auth.admin.listUsers()
    if (listErr) throw listErr
    let user = listData.users.find((u) => u.email === email)
    if (!user) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (error) throw error
      user = data.user
    } else {
      const { error } = await admin.auth.admin.updateUserById(user.id, { password })
      if (error) throw error
    }
    return user
  }

  async signIn(email, password) {
    this.clearCookies()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    this.setAuthCookie(data.session)
  }

  async runTest(name, fn) {
    try {
      await fn()
      log('ok', `✓ ${name}`)
    } catch (err) {
      markFail(new Error(`${name}: ${err.message}`))
    }
  }

  async testPublicPages() {
    const pages = [
      '/',
      '/advertisers',
      '/developers',
      '/transparency',
      '/security',
      '/roadmap',
      '/faq',
      '/terms',
      '/privacy',
      '/contact',
    ]
    for (const path of pages) {
      const res = await this.req(path)
      assertTrue(res.ok, `GET ${path} failed with ${res.status}`)
      assertTrue(res.text.length > 100, `GET ${path} returned empty body`)
    }

    for (const path of ['/api/health', '/api/public-stats']) {
      const res = await this.req(path)
      assertTrue(res.ok, `GET ${path} failed with ${res.status}`)
      assertTrue(res.json !== undefined, `GET ${path} did not return JSON`)
    }
  }

  async testCreatorDashboard() {
    const user = await this.ensureUser(CREATOR_EMAIL, TEST_PASSWORD)
    this.context.creatorId = user.id

    await this.signIn(CREATOR_EMAIL, TEST_PASSWORD)
    const res = await this.req('/api/dashboard')
    assertEqual(res.status, 200, 'GET /api/dashboard status')
    assertTrue(res.json.referral?.referralCode, 'Creator should have a referral code')
    this.context.creatorReferralCode = res.json.referral.referralCode
  }

  async testReferralSetup() {
    const referred = await this.ensureUser(REFERRED_EMAIL, TEST_PASSWORD)
    this.context.referredId = referred.id

    // The referrals table row is created by trigger; just set referred_by.
    const { data: referral } = await admin
      .from('referrals')
      .select('id')
      .eq('user_id', referred.id)
      .maybeSingle()

    if (referral) {
      await admin.from('referrals').update({ referred_by: this.context.creatorId }).eq('id', referral.id)
    }

    // Verify creator dashboard sees the referral.
    await this.signIn(CREATOR_EMAIL, TEST_PASSWORD)
    const res = await this.req('/api/dashboard')
    assertTrue(res.json.referral.referredCount >= 1, 'Creator referredCount should be >= 1')
  }

  async testAdvertiserOnboarding() {
    const user = await this.ensureUser(ADVERTISER_EMAIL, TEST_PASSWORD)
    this.context.advertiserId = user.id

    await this.signIn(ADVERTISER_EMAIL, TEST_PASSWORD)
    const res = await this.req('/api/advertisers', {
      method: 'POST',
      body: {
        name: `Prism Test Advertiser ${RUN_ID}`,
        website: 'https://example.com',
        acceptedTerms: true,
        acceptedPrivacy: true,
      },
    })
    assertTrue(res.status === 201 || res.status === 200, 'POST /api/advertisers status')
    this.context.advertiserRecordId = res.json.id

    const stats = await this.req('/api/advertiser-stats')
    assertEqual(stats.status, 200, 'GET /api/advertiser-stats status')

    // Should not be able to create a campaign before activation.
    const campaignAttempt = await this.req('/api/campaigns', {
      method: 'POST',
      body: {
        title: 'Should Fail',
        copy: 'Inactive advertiser test',
        url: 'https://example.com',
        objective: 'awareness',
        bidType: 'cpm',
        maxBidCpm: 1000,
        budgetCents: 1000,
        contexts: ['cursor'],
      },
    })
    assertEqual(campaignAttempt.status, 403, 'Campaign creation should fail before activation')
  }

  async testTestDeposit() {
    if (!STRIPE_TEST_SECRET_KEY) {
      log('warn', '⚠ STRIPE_TEST_SECRET_KEY not set, skipping test deposit flow')
      return
    }

    await this.signIn(ADVERTISER_EMAIL, TEST_PASSWORD)
    const checkoutRes = await this.req('/api/checkout/test', {
      method: 'POST',
      body: { amountCents: 1000, direct: true },
    })
    assertEqual(checkoutRes.status, 200, 'POST /api/checkout/test status')
    assertEqual(checkoutRes.json.balanceCents, 1000, 'Wallet balance after test deposit')
    assertEqual(checkoutRes.json.status, 'active', 'Advertiser status after test deposit')
  }

  async testCampaignCreation() {
    await this.signIn(ADVERTISER_EMAIL, TEST_PASSWORD)
    const statsCheck = await this.req('/api/advertiser-stats')
    if ((statsCheck.json.advertiser.balanceCents || 0) < 1000) {
      log('warn', '⚠ Advertiser balance too low; skipping campaign creation test')
      return
    }
    const res = await this.req('/api/campaigns', {
      method: 'POST',
      body: {
        title: `Prism Test Campaign ${RUN_ID}`,
        copy: 'Automated test campaign',
        url: 'https://example.com',
        iconUrl: 'https://placehold.co/64x64.png?text=T',
        objective: 'awareness',
        bidType: 'cpm',
        maxBidCpm: 2000,
        budgetCents: 1000,
        contexts: ['cursor', 'vscode', 'typescript'],
      },
    })
    assertEqual(res.status, 201, 'POST /api/campaigns status')
    this.context.campaignId = res.json.id

    const stats = await this.req('/api/advertiser-stats')
    assertEqual(stats.json.advertiser.balanceCents, 0, 'Advertiser balance after campaign creation')
    assertTrue(stats.json.campaigns.some((c) => c.id === this.context.campaignId), 'New campaign in list')
  }

  async testAdLoop() {
    if (!PRISM_API_KEY) {
      log('warn', '⚠ PRISM_API_KEY not set, skipping ad serving loop')
      return
    }

    const sessionId = `test-session-${RUN_ID}`
    this.context.sessionId = sessionId

    if (DEVICE_API_KEY) {
      this.context.deviceApiKey = DEVICE_API_KEY
    } else if (PRISM_API_KEY) {
      // Register a per-device key using the global bootstrap key.
      const deviceRes = await this.req('/api/auth/register-device', {
        method: 'POST',
        headers: { 'x-prism-api-key': PRISM_API_KEY },
        body: { anonymousUserId: this.context.creatorId, fingerprint: {} },
      })
      if (deviceRes.status === 429) {
        log('warn', '⚠ Device registration rate limited. Set PRISM_DEVICE_API_KEY to reuse an existing key.')
        return
      }
      assertEqual(deviceRes.status, 200, 'POST /api/auth/register-device status')
      this.context.deviceApiKey = deviceRes.json.apiKey
      log('blue', `ℹ Reusable device key: ${deviceRes.json.apiKey}`)
    } else {
      log('warn', '⚠ No PRISM_API_KEY or PRISM_DEVICE_API_KEY; skipping ad serving loop')
      return
    }

    const adsRes = await this.req('/api/ads', {
      method: 'POST',
      headers: { 'x-prism-api-key': this.context.deviceApiKey },
      body: {
        context: { editor: 'cursor', aiTool: 'cursor', frameworks: ['typescript'] },
        userId: this.context.creatorId,
        sessionId,
      },
    })
    assertEqual(adsRes.status, 200, 'POST /api/ads status')
    assertTrue(adsRes.json.impressionToken, 'impressionToken missing')
    assertTrue(adsRes.json.conversionToken, 'conversionToken missing')
    assertTrue(adsRes.json.clickUrl, 'clickUrl missing')
    this.context.impressionToken = adsRes.json.impressionToken
    this.context.conversionToken = adsRes.json.conversionToken
    this.context.clickUrl = adsRes.json.clickUrl
    this.context.winnerCampaignId = adsRes.json.id

    const impRes = await this.req('/api/impressions', {
      method: 'POST',
      headers: { 'x-prism-api-key': this.context.deviceApiKey },
      body: {
        userId: this.context.creatorId,
        sessionId,
        campaignId: this.context.winnerCampaignId,
        impressionToken: this.context.impressionToken,
        context: { editor: 'cursor', aiTool: 'cursor' },
        durationMs: 1200,
        fingerprint: {},
      },
    })
    assertEqual(impRes.status, 200, 'POST /api/impressions status')
    assertTrue(impRes.json.validated, 'Impression should be validated')
    assertTrue(impRes.json.payoutCents > 0, 'Impression should pay creator')

    // Click: do not follow the redirect.
    const clickRes = await this.req(this.context.clickUrl, {
      redirect: 'manual',
      headers: { 'x-prism-api-key': this.context.deviceApiKey },
    })
    assertTrue(clickRes.status === 302 || clickRes.status === 307, 'Click should redirect')

    const convRes = await this.req('/api/conversions', {
      method: 'POST',
      headers: { 'x-prism-api-key': this.context.deviceApiKey },
      body: {
        conversionToken: this.context.conversionToken,
        eventName: 'purchase',
        valueCents: 4999,
      },
    })
    assertEqual(convRes.status, 200, 'POST /api/conversions status')

    // Referred-user impression to exercise the referral path.
    if (this.context.referredId && this.context.deviceApiKey) {
      const adsRes2 = await this.req('/api/ads', {
        method: 'POST',
        headers: { 'x-prism-api-key': this.context.deviceApiKey },
        body: {
          context: { editor: 'vscode', aiTool: 'copilot' },
          userId: this.context.referredId,
          sessionId: `${sessionId}-ref`,
        },
      })
      if (adsRes2.ok) {
        await this.req('/api/impressions', {
          method: 'POST',
          headers: { 'x-prism-api-key': this.context.deviceApiKey },
          body: {
            userId: this.context.referredId,
            sessionId: `${sessionId}-ref`,
            campaignId: adsRes2.json.id,
            impressionToken: adsRes2.json.impressionToken,
            context: { editor: 'vscode' },
            durationMs: 1200,
            fingerprint: {},
          },
        })
      }
    }
  }

  async testDashboardStatsUpdated() {
    await this.signIn(CREATOR_EMAIL, TEST_PASSWORD)
    const res = await this.req('/api/dashboard')
    assertEqual(res.status, 200, 'GET /api/dashboard after impressions')
    assertTrue(res.json.stats.totalImpressions >= 1, 'Creator should have impressions')
    assertTrue(res.json.stats.totalEarningsCents > 0, 'Creator should have earnings')

    await this.signIn(ADVERTISER_EMAIL, TEST_PASSWORD)
    const stats = await this.req('/api/advertiser-stats')
    assertEqual(stats.status, 200, 'GET /api/advertiser-stats after loop')
    assertTrue(stats.json.stats.totalImpressions >= 1, 'Advertiser should have impressions')
  }

  async testPayoutSettings() {
    await this.signIn(CREATOR_EMAIL, TEST_PASSWORD)
    const getRes = await this.req('/api/builder/payout-settings')
    assertEqual(getRes.status, 200, 'GET /api/builder/payout-settings status')

    const payoutsRes = await this.req('/api/dashboard/payouts')
    assertEqual(payoutsRes.status, 200, 'GET /api/dashboard/payouts status')
    assertTrue(typeof payoutsRes.json.availableCents === 'number', 'availableCents missing')

    // Expect a 400 because provider credentials are not configured in production.
    const postRes = await this.req('/api/builder/payout-settings', {
      method: 'POST',
      body: {
        provider: 'payoneer',
        recipientDetails: { payoneerEmail: 'test@example.com' },
      },
    })
    assertEqual(postRes.status, 400, 'POST /api/builder/payout-settings should reject missing credentials')
  }

  async testAdminRoutes() {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !ADMIN_SECRET) {
      log('warn', '⚠ Admin credentials not provided, skipping admin route tests')
      return
    }

    // Detect whether we are creating the admin user so we don't delete a real one.
    const { data: beforeList } = await admin.auth.admin.listUsers()
    const adminExisted = beforeList.users.some((u) => u.email === ADMIN_EMAIL)

    const adminUser = await this.ensureUser(ADMIN_EMAIL, ADMIN_PASSWORD)
    this.context.adminId = adminUser.id
    this.context.adminCreated = !adminExisted
    await this.signIn(ADMIN_EMAIL, ADMIN_PASSWORD)

    for (const path of ['/api/admin/anomalies', '/api/admin/payouts', '/api/admin/audit-logs']) {
      const res = await this.req(path, {
        headers: { 'x-admin-secret': ADMIN_SECRET },
      })
      assertEqual(res.status, 200, `GET ${path} status`)
    }

    // Create a performance campaign so there is something pending for admin review.
    await this.signIn(ADVERTISER_EMAIL, TEST_PASSWORD)
    // Top up first if balance is zero.
    const statsBefore = await this.req('/api/advertiser-stats')
    if ((statsBefore.json.advertiser.balanceCents || 0) < 1000) {
      log('warn', 'Advertiser balance too low for pending campaign test; skipping admin approval')
      return
    }

    const campaignRes = await this.req('/api/campaigns', {
      method: 'POST',
      body: {
        title: `Prism Test Performance ${RUN_ID}`,
        copy: 'Pending review test',
        url: 'https://example.com',
        objective: 'performance',
        bidType: 'cpm',
        maxBidCpm: 1000,
        budgetCents: 1000,
        contexts: ['cursor'],
      },
    })
    assertEqual(campaignRes.status, 201, 'POST performance campaign status')
    this.context.pendingCampaignId = campaignRes.json.id
    assertEqual(campaignRes.json.status, 'pending_review', 'Performance campaign should be pending_review')

    await this.signIn(ADMIN_EMAIL, ADMIN_PASSWORD)
    const pendingRes = await this.req('/api/admin/campaigns/pending', {
      headers: { 'x-admin-secret': ADMIN_SECRET },
    })
    assertTrue(pendingRes.json.some((c) => c.id === this.context.pendingCampaignId), 'Pending campaign should appear for admin')

    const approveRes = await this.req(`/api/admin/campaigns/${this.context.pendingCampaignId}/approve`, {
      method: 'POST',
      headers: { 'x-admin-secret': ADMIN_SECRET },
      body: {},
    })
    assertEqual(approveRes.status, 200, 'POST /api/admin/campaigns/[id]/approve status')
  }

  async cleanup() {
    if (!CLEANUP) {
      log('blue', 'ℹ TEST_CLEANUP is not set; test data remains in the database')
      return
    }

    log('blue', '🧹 Cleaning up test data…')
    const ids = [
      this.context.creatorId,
      this.context.advertiserId,
      this.context.referredId,
      ...(this.context.adminCreated ? [this.context.adminId] : []),
    ].filter(Boolean)

    if (ids.length === 0) return

    try {
      await admin.from('conversions').delete().in('user_id', ids)
      await admin.from('clicks').delete().in('user_id', ids)
      await admin.from('impressions').delete().in('user_id', ids)
      await admin.from('payouts').delete().in('user_id', ids)
      await admin.from('builder_payout_settings').delete().in('auth_user_id', ids)

      if (this.context.campaignId || this.context.pendingCampaignId) {
        const campaignIds = [this.context.campaignId, this.context.pendingCampaignId].filter(Boolean)
        await admin.from('campaigns').delete().in('id', campaignIds)
      }

      if (this.context.advertiserRecordId) {
        await admin.from('advertisers').delete().eq('id', this.context.advertiserRecordId)
      }

      await admin
        .from('referrals')
        .delete()
        .or(`user_id.in.(${ids.join(',')}),referred_by.in.(${ids.join(',')})`)

      for (const id of ids) {
        await admin.auth.admin.deleteUser(id)
      }

      log('ok', '✓ Cleanup complete')
    } catch (err) {
      log('warn', `⚠ Cleanup failed: ${err.message}`)
    }
  }

  async run() {
    console.log(`${COLORS.blue}Prism pre-production smoke test${COLORS.reset}`)
    console.log(`${COLORS.dim}Base URL: ${BASE_URL}${COLORS.reset}\n`)

    await this.runTest('Public pages & health', () => this.testPublicPages())
    await this.runTest('Creator dashboard & referral code', () => this.testCreatorDashboard())
    await this.runTest('Referral setup', () => this.testReferralSetup())
    await this.runTest('Advertiser onboarding', () => this.testAdvertiserOnboarding())
    await this.runTest('Stripe test deposit', () => this.testTestDeposit())
    await this.runTest('Campaign creation', () => this.testCampaignCreation())
    await this.runTest('Ad serving / impression / click / conversion loop', () => this.testAdLoop())
    await this.runTest('Dashboard stats updated', () => this.testDashboardStatsUpdated())
    await this.runTest('Payout settings', () => this.testPayoutSettings())
    await this.runTest('Admin routes', () => this.testAdminRoutes())

    await this.cleanup()

    console.log('\n' + (failed ? COLORS.red + 'Some tests failed.' : COLORS.green + 'All tests passed.') + COLORS.reset)
    process.exit(failed ? 1 : 0)
  }
}

// --- bootstrap ---

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required Supabase credentials. Set:')
  console.error('  NEXT_PUBLIC_SUPABASE_URL')
  console.error('  NEXT_PUBLIC_SUPABASE_ANON_KEY')
  console.error('  SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const tester = new Tester()
tester.run().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})

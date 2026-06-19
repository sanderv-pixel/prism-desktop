import { describe, it } from 'node:test'
import assert from 'node:assert'
import { computeAdvertiserStats } from './advertiserStats'

describe('computeAdvertiserStats', () => {
  const advertiser = {
    id: 'adv-1',
    name: 'Atlas Digital',
    status: 'active',
    subscription_status: 'active',
    balance_cents: 100000,
    lifetime_deposits_cents: 100000,
  }

  const campaigns = [
    {
      id: 'camp-a',
      advertiser_id: 'adv-1',
      title: 'Railway Launch Week',
      objective: 'awareness',
      bid_type: 'cpm',
      max_bid_cpm: 1200,
      budget_cents: 25000,
      spent_cents: 4200,
      status: 'active',
      contexts: ['cursor', 'vscode'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'camp-b',
      advertiser_id: 'adv-1',
      title: 'Supabase Launch Week',
      objective: 'awareness',
      bid_type: 'cpm',
      max_bid_cpm: 1500,
      budget_cents: 50000,
      spent_cents: 8900,
      status: 'active',
      contexts: ['postgresql'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ]

  const now = new Date('2024-06-15T12:00:00Z')
  const dayAgo = (n: number) =>
    new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString()

  it('returns aggregate totals and per-campaign breakdowns', () => {
    const impressions = [
      { campaign_id: 'camp-a', auction_price_cpm: 1200, session_id: 's1', created_at: dayAgo(0) },
      { campaign_id: 'camp-a', auction_price_cpm: 1200, session_id: 's2', created_at: dayAgo(1) },
      { campaign_id: 'camp-b', auction_price_cpm: 1500, session_id: 's3', created_at: dayAgo(2) },
      { campaign_id: 'camp-b', auction_price_cpm: 1500, session_id: 's3', created_at: dayAgo(3) },
    ]
    const clicks = [
      { campaign_id: 'camp-a', created_at: dayAgo(0) },
      { campaign_id: 'camp-b', created_at: dayAgo(2) },
    ]
    const conversions = [
      { campaign_id: 'camp-a', value_cents: 4999, created_at: dayAgo(0) },
    ]

    const result = computeAdvertiserStats(advertiser, campaigns, impressions, clicks, conversions, 30, now)

    assert.strictEqual(result.advertiser.name, 'Atlas Digital')
    assert.strictEqual(result.stats.totalImpressions, 4)
    assert.strictEqual(result.stats.totalClicks, 2)
    assert.strictEqual(result.stats.totalConversions, 1)
    assert.strictEqual(result.stats.activeCampaigns, 2)
    assert.strictEqual(result.stats.totalCampaigns, 2)
    assert.strictEqual(result.stats.totalBudgetCents, 75000)
    assert.strictEqual(result.stats.totalSpendCents, 13100)
    assert.strictEqual(result.stats.ctr, 50)

    const campA = result.campaigns.find((c) => c.id === 'camp-a')!
    const campB = result.campaigns.find((c) => c.id === 'camp-b')!

    assert.strictEqual(campA.impressions, 2)
    assert.strictEqual(campA.clicks, 1)
    assert.strictEqual(campA.conversions, 1)
    assert.strictEqual(campA.ctr, 50)

    assert.strictEqual(campB.impressions, 2)
    assert.strictEqual(campB.clicks, 1)
    assert.strictEqual(campB.conversions, 0)
    assert.strictEqual(campB.ctr, 50)

    assert.strictEqual(result.chartData.length, 30)
    const today = result.chartData.find((d) => d.date === dayAgo(0).split('T')[0])!
    assert.strictEqual(today.impressions, 1)
    assert.strictEqual(today.clicks, 1)
  })

  it('handles empty data without crashing', () => {
    const result = computeAdvertiserStats(advertiser, campaigns, [], [], [], 30, now)
    assert.strictEqual(result.stats.totalImpressions, 0)
    assert.strictEqual(result.stats.ctr, 0)
    assert.strictEqual(result.campaigns[0].impressions, 0)
    assert.strictEqual(result.campaigns[0].ctr, 0)
  })
})

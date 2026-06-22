import { createAdminClient } from '@/utils/supabase/admin'
import { kvIncr, kvSet, kvDel } from '@/lib/redis'
import { getIdenticalContextCount } from '@/lib/api/fraud'
import { sendPayoutHoldEmail, sendAdminAnomalyAlertEmail } from '@/lib/email/helpers'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/utils/supabase/database.types'

export type AnomalyType =
  | 'ip_impression_spike'
  | 'campaign_impression_spike'
  | 'user_impression_spike'
  | 'repeated_context_fingerprint'
  | 'rapid_budget_drain'
  | 'heartbeat_coverage_low'

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical'

interface AnomalyEventInput {
  type: AnomalyType
  severity: AnomalySeverity
  details: Record<string, unknown>
}

function safeJson(value: Record<string, unknown>): Json {
  return value as Json
}

const WINDOW_SECONDS = 300 // 5-minute rolling window for spike counters.

const THRESHOLDS: Record<AnomalyType, number> = {
  ip_impression_spike: 100, // 100 impressions from one IP in 5 min.
  campaign_impression_spike: 200, // 200 impressions on one campaign in 5 min.
  user_impression_spike: 50, // 50 impressions for one user in 5 min.
  repeated_context_fingerprint: 20, // 20 identical context hashes in 1 hour.
  rapid_budget_drain: 1, // Fired once when >50% of budget spent in 1 hour.
  heartbeat_coverage_low: 10, // 10 missing/short-heartbeat impressions / hour / identity.
}

// Anti-bot: when heartbeat enforcement is on, an identity racking up impressions
// with missing or too-short heartbeat coverage is likely a bot fetching tokens
// without keeping a live session. Counts per identity per hour; raises once over
// threshold. Fire-and-forget from the impressions path.
export async function recordHeartbeatCoverageAnomaly(userId: string): Promise<void> {
  const count = await kvIncr(`anomaly:hbcov:${userId}`, 60 * 60)
  if (count === THRESHOLDS.heartbeat_coverage_low) {
    await recordAnomaly({
      type: 'heartbeat_coverage_low',
      severity: 'medium',
      details: { userId, count, windowSeconds: 3600 },
    })
  }
}

/**
 * Record an anomaly event to the database for the admin review queue.
 */
export async function recordAnomaly(event: AnomalyEventInput): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('anomaly_events').insert({
    type: event.type,
    severity: event.severity,
    details: safeJson(event.details),
  })

  if (event.severity === 'high' || event.severity === 'critical') {
    const hour = new Date().toISOString().slice(0, 13)
    const dedupKey = `email:anomaly:${event.type}:${hour}`
    kvSet(dedupKey, '1', { ex: 3600, nx: true })
      .then((result) => {
        if (result === 'OK') {
          sendAdminAnomalyAlertEmail(event.type, event.severity, event.details).catch(() => {})
        }
      })
      .catch(() => {})
  }
}

/**
 * Set or clear the payout hold flag for a user. Used to freeze payouts
 * automatically when fraud spikes are detected.
 */
export async function setUserPayoutHold(
  userId: string,
  hold: boolean
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.rpc('set_payout_hold', {
    p_user_id: userId,
    p_hold: hold,
  })
  if (error) throw error

  // Notify the user at most once per state transition. The hold detector runs on
  // every impression, so without this a busy device re-emails the same "on hold"
  // notice over and over. We only send when this state is newly set, and clear the
  // opposite key so a genuine later transition can notify again.
  const sentKey = `email:payouthold:${userId}:${hold ? 'on' : 'off'}`
  const oppositeKey = `email:payouthold:${userId}:${hold ? 'off' : 'on'}`
  const fresh = await kvSet(sentKey, '1', { ex: 7 * 24 * 3600, nx: true }).catch(() => null)
  if (fresh === 'OK') {
    await kvDel(oppositeKey).catch(() => {})
    sendPayoutHoldEmail(userId, hold).catch(() => {})
  }
}

/**
 * Increment a Redis counter for the given anomaly key and return the new count.
 */
async function incrementCounter(key: string): Promise<number> {
  return kvIncr(`anomaly:${key}`, WINDOW_SECONDS)
}

/**
 * Detect impression-flow anomalies. This is intentionally lightweight and
 * non-blocking: suspicious traffic is still logged, but an alert is created
 * so operators can review or tune thresholds.
 */
export async function detectImpressionAnomalies(input: {
  userId: string
  campaignId: string
  clientIp: string
  contextHash: string | null
}): Promise<void> {
  const { userId, campaignId, clientIp, contextHash } = input
  const adminClient = createAdminClient()

  const [ipCount, campaignCount, userCount, identicalContextCount] = await Promise.all([
    incrementCounter(`ip:${clientIp}`),
    incrementCounter(`campaign:${campaignId}`),
    incrementCounter(`user:${userId}`),
    contextHash ? getIdenticalContextCount(adminClient, contextHash) : Promise.resolve(0),
  ])

  if (ipCount >= THRESHOLDS.ip_impression_spike) {
    await recordAnomaly({
      type: 'ip_impression_spike',
      severity: 'high',
      details: { clientIp, count: ipCount, windowSeconds: WINDOW_SECONDS },
    })  }

  if (campaignCount >= THRESHOLDS.campaign_impression_spike) {
    await recordAnomaly({
      type: 'campaign_impression_spike',
      severity: 'medium',
      details: { campaignId, count: campaignCount, windowSeconds: WINDOW_SECONDS },
    })
  }

  if (userCount >= THRESHOLDS.user_impression_spike) {
    await recordAnomaly({
      type: 'user_impression_spike',
      severity: 'medium',
      details: { userId, count: userCount, windowSeconds: WINDOW_SECONDS },
    })  }

  if (contextHash && identicalContextCount >= THRESHOLDS.repeated_context_fingerprint) {
    await recordAnomaly({
      type: 'repeated_context_fingerprint',
      severity: 'high',
      details: { contextHash, count: identicalContextCount },
    })  }
}

/**
 * Detect rapid budget drain after a campaign spend increment.
 */
export async function detectBudgetDrainAnomaly(campaign: {
  id: string
  title: string
  budget_cents: number
  spent_cents: number
}): Promise<void> {
  if (campaign.budget_cents <= 0) return

  const shareSpent = campaign.spent_cents / campaign.budget_cents
  if (shareSpent < 0.5) return

  const supabase = createAdminClient()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  // Only alert once per campaign per hour.
  const { count } = await supabase
    .from('anomaly_events')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'rapid_budget_drain')
    .eq("details->>'campaignId'", campaign.id)
    .gte('created_at', oneHourAgo)

  if (count && count > 0) return

  await recordAnomaly({
    type: 'rapid_budget_drain',
    severity: shareSpent >= 0.9 ? 'critical' : 'high',
    details: {
      campaignId: campaign.id,
      title: campaign.title,
      budgetCents: campaign.budget_cents,
      spentCents: campaign.spent_cents,
      shareSpent,
    },
  })
}

export interface AnomalyQueryOptions {
  acknowledged?: boolean
  type?: AnomalyType
  severity?: AnomalySeverity
  limit?: number
  offset?: number
}

/**
 * Fetch anomaly events for the admin review UI.
 */
export async function fetchAnomalies(
  supabase: SupabaseClient<Database>,
  options: AnomalyQueryOptions = {}
) {
  const { acknowledged, type, severity, limit = 100, offset = 0 } = options
  let query = supabase
    .from('anomaly_events')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (acknowledged === false) query = query.is('acknowledged_at', null)
  if (acknowledged === true) query = query.not('acknowledged_at', 'is', null)
  if (type) query = query.eq('type', type)
  if (severity) query = query.eq('severity', severity)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function acknowledgeAnomaly(
  supabase: SupabaseClient<Database>,
  anomalyId: string,
  adminUserId: string
): Promise<void> {
  const { error } = await supabase
    .from('anomaly_events')
    .update({
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: adminUserId,
    })
    .eq('id', anomalyId)
  if (error) throw error
}

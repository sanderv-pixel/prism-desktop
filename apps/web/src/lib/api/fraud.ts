import { NextRequest } from 'next/server'
import { kvIncr } from '@/lib/redis'
import {
  getDeviceCredentialByUserId,
  hashFingerprint,
  incrementFingerprintMismatchCount,
} from './device-keys'

export interface FraudSignals {
  userId: string
  campaignId: string
  durationMs: number
  clientIp: string
  userAgent: string | null
  contextHash: string | null
}

export interface FraudResult {
  blocked: boolean
  reasons: string[]
  score: number
}

const FRAUD_WINDOW_SECONDS = 60
const MAX_IP_IMPRESSIONS_PER_MIN = 120
const MAX_USER_CAMPAIGN_IMPRESSIONS_PER_MIN = 10
const MIN_HUMAN_DURATION_MS = 400
const MAX_HUMAN_DURATION_MS = 600 * 1000 // 10 minutes

// DB-backed thresholds.
const MAX_DAILY_IMPRESSIONS_PER_USER = 200
const MIN_SECONDS_BETWEEN_USER_IMPRESSIONS = 2
const MAX_DISTINCT_USERS_PER_IP_HOUR = 10
const MAX_IDENTICAL_CONTEXTS_PER_HOUR = 5

// Scoring weights.
const BLOCK_WEIGHT = 10
const FLAG_WEIGHT = 5
const SCORE_BLOCK_THRESHOLD = 10

const KNOWN_BOT_PATTERNS = [
  /bot/i,
  /crawl/i,
  /spider/i,
  /scrape/i,
  /curl/i,
  /wget/i,
  /python-requests/i,
  /java\/|httpclient/i,
  /headless/i,
  /puppeteer/i,
  /playwright/i,
  /selenium/i,
]

interface SupabaseLike {
  from: (table: string) => any
}

function isBotUserAgent(ua: string | null): boolean {
  if (!ua || ua.trim().length === 0) return true
  return KNOWN_BOT_PATTERNS.some((pattern) => pattern.test(ua))
}

async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input))
  return Buffer.from(digest).toString('hex')
}

async function getUserDailyImpressionCount(
  supabase: SupabaseLike,
  userId: string
): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count, error } = await supabase
    .from('impressions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since)
  if (error) throw error
  return count ?? 0
}

async function getUserLastImpressionSecondsAgo(
  supabase: SupabaseLike,
  userId: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from('impressions')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data?.created_at) return null
  return (Date.now() - new Date(data.created_at).getTime()) / 1000
}

async function getDistinctUsersForIp(
  supabase: SupabaseLike,
  clientIp: string
): Promise<number> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('impressions')
    .select('user_id', { count: 'exact' })
    .eq('client_ip', clientIp)
    .gte('created_at', since)
  if (error) throw error
  const distinct = new Set((data ?? []).map((row: any) => row.user_id))
  return distinct.size
}

export async function getIdenticalContextCount(
  supabase: SupabaseLike,
  contextHash: string | null
): Promise<number> {
  if (!contextHash) return 0
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count, error } = await supabase
    .from('impressions')
    .select('*', { count: 'exact', head: true })
    .eq('context_hash', contextHash)
    .gte('created_at', since)
  if (error) throw error
  return count ?? 0
}

async function getUserCampaignRecentCount(
  supabase: SupabaseLike,
  userId: string,
  campaignId: string
): Promise<number> {
  const since = new Date(Date.now() - FRAUD_WINDOW_SECONDS * 1000).toISOString()
  const { count, error } = await supabase
    .from('impressions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('campaign_id', campaignId)
    .gte('created_at', since)
  if (error) throw error
  return count ?? 0
}

export async function contextHash(context: string): Promise<string> {
  return hashString(context)
}

export async function evaluateFraud(
  supabase: SupabaseLike,
  signals: FraudSignals
): Promise<FraudResult> {
  const { userId, campaignId, durationMs, clientIp, userAgent, contextHash } = signals
  const reasons: string[] = []
  let score = 0

  // 1. Duration sanity checks.
  if (durationMs < MIN_HUMAN_DURATION_MS) {
    reasons.push('duration_too_short')
    score += BLOCK_WEIGHT
  }
  if (durationMs > MAX_HUMAN_DURATION_MS) {
    reasons.push('duration_too_long')
    score += BLOCK_WEIGHT
  }

  // 2. User-agent bot detection.
  if (isBotUserAgent(userAgent)) {
    reasons.push('suspicious_user_agent')
    score += BLOCK_WEIGHT
  }

  // 3. Redis-backed IP velocity.
  const ipCount = await kvIncr(`fraud:ip:${clientIp}`, FRAUD_WINDOW_SECONDS)
  if (ipCount > MAX_IP_IMPRESSIONS_PER_MIN) {
    reasons.push('ip_velocity')
    score += BLOCK_WEIGHT
  }

  // 4. Redis-backed user-campaign velocity.
  const ucCount = await kvIncr(`fraud:uc:${userId}:${campaignId}`, FRAUD_WINDOW_SECONDS)
  if (ucCount > MAX_USER_CAMPAIGN_IMPRESSIONS_PER_MIN) {
    reasons.push('user_campaign_velocity')
    score += BLOCK_WEIGHT
  }

  // Run independent DB-backed checks in parallel.
  const [
    dailyCount,
    secondsSinceLast,
    distinctUsersOnIp,
    identicalContextCount,
    recentUserCampaignCount,
  ] = await Promise.all([
    getUserDailyImpressionCount(supabase, userId),
    getUserLastImpressionSecondsAgo(supabase, userId),
    getDistinctUsersForIp(supabase, clientIp),
    getIdenticalContextCount(supabase, contextHash),
    getUserCampaignRecentCount(supabase, userId, campaignId),
  ])

  // 5. Per-user daily cap.
  if (dailyCount >= MAX_DAILY_IMPRESSIONS_PER_USER) {
    reasons.push('daily_user_impression_cap')
    score += BLOCK_WEIGHT
  }

  // 6. Too fast between impressions (minimum human reaction time).
  if (secondsSinceLast !== null && secondsSinceLast < MIN_SECONDS_BETWEEN_USER_IMPRESSIONS) {
    reasons.push('impression_too_fast')
    score += BLOCK_WEIGHT
  }

  // 7. Sybil / IP farming detection.
  if (distinctUsersOnIp > MAX_DISTINCT_USERS_PER_IP_HOUR) {
    reasons.push('too_many_users_on_ip')
    score += BLOCK_WEIGHT
  } else if (distinctUsersOnIp > 3) {
    reasons.push('multiple_users_on_ip')
    score += FLAG_WEIGHT
  }

  // 8. Repeated identical context (copy-paste / replay bots).
  if (identicalContextCount >= MAX_IDENTICAL_CONTEXTS_PER_HOUR) {
    reasons.push('repeated_context_fingerprint')
    score += BLOCK_WEIGHT
  } else if (identicalContextCount >= 2) {
    reasons.push('duplicate_context_fingerprint')
    score += FLAG_WEIGHT
  }

  // 9. DB-backed user-campaign velocity (defense if Redis is unavailable).
  if (recentUserCampaignCount > MAX_USER_CAMPAIGN_IMPRESSIONS_PER_MIN) {
    reasons.push('user_campaign_velocity_db')
    score += BLOCK_WEIGHT
  }

  const blocked = score >= SCORE_BLOCK_THRESHOLD
  return { blocked, reasons, score }
}

const FINGERPRINT_MISMATCH_BLOCK_THRESHOLD = 3

export async function evaluateDeviceFingerprint(
  supabase: SupabaseLike,
  userId: string,
  fingerprint: unknown
): Promise<FraudResult> {
  const credential = await getDeviceCredentialByUserId(userId)
  if (!credential || !credential.fingerprint_hash) {
    return { blocked: false, reasons: [], score: 0 }
  }

  if (!fingerprint) {
    // A registered device that stops sending a fingerprint is mildly suspicious.
    return {
      blocked: false,
      reasons: ['missing_device_fingerprint'],
      score: FLAG_WEIGHT,
    }
  }

  const providedHash = await hashFingerprint(fingerprint)
  if (providedHash === credential.fingerprint_hash) {
    return { blocked: false, reasons: [], score: 0 }
  }

  const mismatchCount = await incrementFingerprintMismatchCount(userId)

  if (mismatchCount >= FINGERPRINT_MISMATCH_BLOCK_THRESHOLD) {
    return {
      blocked: true,
      reasons: ['device_fingerprint_mismatch'],
      score: BLOCK_WEIGHT,
    }
  }

  return {
    blocked: false,
    reasons: ['device_fingerprint_mismatch'],
    score: FLAG_WEIGHT,
  }
}

export async function getUserCampaignFrequencyCount(
  supabase: SupabaseLike,
  userId: string,
  campaignId: string,
  windowHours: number
): Promise<number> {
  const since = new Date(
    Date.now() - windowHours * 60 * 60 * 1000
  ).toISOString()
  const { count, error } = await supabase
    .from('impressions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('campaign_id', campaignId)
    .eq('validated', true)
    .gte('created_at', since)
  if (error) throw error
  return count ?? 0
}

export interface ClickFraudSignals {
  userId: string
  campaignId: string
  sessionId: string
  clientIp: string
  userAgent: string | null
}

const MAX_CLICKS_PER_IP_PER_MIN = 60
const MAX_CLICKS_PER_SESSION_PER_MIN = 30
const CLICK_FRAUD_WINDOW_SECONDS = 60

export async function evaluateClickFraud(
  _supabase: SupabaseLike,
  signals: ClickFraudSignals
): Promise<FraudResult> {
  const { userId, campaignId, sessionId, clientIp, userAgent } = signals
  const reasons: string[] = []
  let score = 0

  if (isBotUserAgent(userAgent)) {
    reasons.push('suspicious_user_agent')
    score += BLOCK_WEIGHT
  }

  const ipCount = await kvIncr(`fraud:click:ip:${clientIp}`, CLICK_FRAUD_WINDOW_SECONDS)
  if (ipCount > MAX_CLICKS_PER_IP_PER_MIN) {
    reasons.push('click_ip_velocity')
    score += BLOCK_WEIGHT
  }

  const sessionCount = await kvIncr(
    `fraud:click:session:${sessionId}`,
    CLICK_FRAUD_WINDOW_SECONDS
  )
  if (sessionCount > MAX_CLICKS_PER_SESSION_PER_MIN) {
    reasons.push('click_session_velocity')
    score += BLOCK_WEIGHT
  }

  // A single user clicking many distinct campaigns rapidly is suspicious.
  const userCampaignCount = await kvIncr(
    `fraud:click:uc:${userId}:${campaignId}`,
    CLICK_FRAUD_WINDOW_SECONDS
  )
  if (userCampaignCount > 10) {
    reasons.push('click_user_campaign_velocity')
    score += BLOCK_WEIGHT
  }

  const blocked = score >= SCORE_BLOCK_THRESHOLD
  return { blocked, reasons, score }
}

export interface ConversionFraudSignals {
  campaignId: string
  clientIp: string
  userAgent: string | null
  valueCents: number
}

const MAX_CONVERSIONS_PER_IP_PER_MIN = 30
const MAX_CONVERSIONS_PER_CAMPAIGN_PER_MIN = 20
const CONVERSION_FRAUD_WINDOW_SECONDS = 60

export async function evaluateConversionFraud(
  _supabase: SupabaseLike,
  signals: ConversionFraudSignals
): Promise<FraudResult> {
  const { campaignId, clientIp, userAgent, valueCents } = signals
  const reasons: string[] = []
  let score = 0

  if (isBotUserAgent(userAgent)) {
    reasons.push('suspicious_user_agent')
    score += BLOCK_WEIGHT
  }

  if (valueCents <= 0) {
    reasons.push('zero_value_conversion')
    score += FLAG_WEIGHT
  }

  const ipCount = await kvIncr(
    `fraud:conversion:ip:${clientIp}`,
    CONVERSION_FRAUD_WINDOW_SECONDS
  )
  if (ipCount > MAX_CONVERSIONS_PER_IP_PER_MIN) {
    reasons.push('conversion_ip_velocity')
    score += BLOCK_WEIGHT
  }

  const campaignCount = await kvIncr(
    `fraud:conversion:campaign:${campaignId}`,
    CONVERSION_FRAUD_WINDOW_SECONDS
  )
  if (campaignCount > MAX_CONVERSIONS_PER_CAMPAIGN_PER_MIN) {
    reasons.push('conversion_campaign_velocity')
    score += BLOCK_WEIGHT
  }

  const blocked = score >= SCORE_BLOCK_THRESHOLD
  return { blocked, reasons, score }
}

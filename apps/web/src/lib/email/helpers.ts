import { createAdminClient } from '@/utils/supabase/admin'
import {
  sendEmail,
  adminEmailRecipients,
  advertiserOnboardingSubmittedEmail,
  advertiserApprovedEmail,
  advertiserRejectedEmail,
  depositReceiptEmail,
  campaignLiveEmail,
  campaignSubmittedEmail,
  campaignApprovedEmail,
  campaignRejectedEmail,
  campaignStatusChangedEmail,
  campaignBudgetExhaustedEmail,
  lowBalanceEmail,
  builderWelcomeEmail,
  payoutRequestedEmail,
  payoutPaidEmail,
  payoutRejectedEmail,
  payoutHoldEmail,
  adminAdvertiserPendingEmail,
  adminCampaignPendingEmail,
  adminPayoutRequestedEmail,
  adminAnomalyAlertEmail,
} from './index'
import { kvGet, kvSet } from '@/lib/redis'

const LOW_BALANCE_THRESHOLD_CENTS = 500
const LOW_BALANCE_KEY_PREFIX = 'email:low_balance:'
const LOW_BALANCE_TTL_SECONDS = 24 * 60 * 60

export async function getUserEmailById(userId: string): Promise<string | null> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient.auth.admin.getUserById(userId)
  if (error) {
    console.error('Failed to fetch user email:', error)
    return null
  }
  return data.user.email ?? null
}

export async function getAdvertiserById(advertiserId: string) {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('advertisers')
    .select('id, name, email, status, balance_cents')
    .eq('id', advertiserId)
    .single()

  if (error) {
    console.error('Failed to fetch advertiser:', error)
    return null
  }
  return data
}

export async function getCampaignWithAdvertiser(campaignId: string) {
  const adminClient = createAdminClient()
  const { data: campaign, error: campaignError } = await adminClient
    .from('campaigns')
    .select('id, advertiser_id, title, status, budget_cents, spent_cents')
    .eq('id', campaignId)
    .single()

  if (campaignError || !campaign) {
    console.error('Failed to fetch campaign:', campaignError)
    return null
  }

  const { data: advertiser, error: advertiserError } = await adminClient
    .from('advertisers')
    .select('id, name, email, status, balance_cents')
    .eq('id', campaign.advertiser_id)
    .single()

  if (advertiserError) {
    console.error('Failed to fetch advertiser for campaign:', advertiserError)
    return null
  }

  return { ...campaign, advertiser }
}

// Advertiser emails

export async function sendAdvertiserOnboardingSubmittedEmail(advertiserId: string) {
  const advertiser = await getAdvertiserById(advertiserId)
  if (!advertiser?.email) return
  const { subject, html, text } = advertiserOnboardingSubmittedEmail(advertiser.name || advertiser.email)
  await sendEmail({ to: advertiser.email, subject, html, text }).catch(() => {})
}

export async function sendAdminAdvertiserPendingEmail(advertiserId: string) {
  const advertiser = await getAdvertiserById(advertiserId)
  if (!advertiser) return
  const { subject, html, text } = adminAdvertiserPendingEmail(advertiser.name || 'Unknown', advertiser.email || '')
  await sendEmail({ to: adminEmailRecipients(), subject, html, text }).catch(() => {})
}

export async function sendAdminCampaignPendingEmail(advertiserId: string) {
  const advertiser = await getAdvertiserById(advertiserId)
  if (!advertiser) return
  const { subject, html, text } = adminCampaignPendingEmail(advertiser.name || 'Unknown', advertiser.email || '')
  await sendEmail({ to: adminEmailRecipients(), subject, html, text }).catch(() => {})
}

export async function sendAdvertiserApprovedEmail(advertiserId: string) {
  const advertiser = await getAdvertiserById(advertiserId)
  if (!advertiser?.email) return
  const { subject, html, text } = advertiserApprovedEmail(advertiser.name || advertiser.email)
  await sendEmail({ to: advertiser.email, subject, html, text }).catch(() => {})
}

export async function sendAdvertiserRejectedEmail(advertiserId: string) {
  const advertiser = await getAdvertiserById(advertiserId)
  if (!advertiser?.email) return
  const { subject, html, text } = advertiserRejectedEmail(advertiser.name || advertiser.email)
  await sendEmail({ to: advertiser.email, subject, html, text }).catch(() => {})
}

export async function sendDepositReceiptEmail(
  advertiserId: string,
  amountCents: number,
  balanceCents: number
) {
  const advertiser = await getAdvertiserById(advertiserId)
  if (!advertiser?.email) return
  const { subject, html, text } = depositReceiptEmail(advertiser.name || advertiser.email, amountCents, balanceCents)
  await sendEmail({ to: advertiser.email, subject, html, text }).catch(() => {})
}

export async function sendCampaignStatusEmail(
  campaignId: string,
  status: 'paused' | 'resumed' | 'pending_review'
) {
  const campaign = await getCampaignWithAdvertiser(campaignId)
  if (!campaign?.advertiser?.email) return
  const advertiser = campaign.advertiser
  const { subject, html, text } = campaignStatusChangedEmail(
    advertiser.name || advertiser.email,
    campaign.title,
    status
  )
  await sendEmail({ to: advertiser.email, subject, html, text }).catch(() => {})
}

export async function sendCampaignSubmittedEmail(campaignId: string) {
  const campaign = await getCampaignWithAdvertiser(campaignId)
  if (!campaign?.advertiser?.email) return
  const advertiser = campaign.advertiser
  const { subject, html, text } = campaignSubmittedEmail(advertiser.name || advertiser.email, campaign.title)
  await sendEmail({ to: advertiser.email, subject, html, text }).catch(() => {})

  await sendAdminCampaignPendingEmail(campaign.advertiser_id)
}

export async function sendCampaignApprovedEmail(campaignId: string) {
  const campaign = await getCampaignWithAdvertiser(campaignId)
  if (!campaign?.advertiser?.email) return
  const advertiser = campaign.advertiser
  const { subject, html, text } = campaignApprovedEmail(advertiser.name || advertiser.email, campaign.title)
  await sendEmail({ to: advertiser.email, subject, html, text }).catch(() => {})
}

export async function sendCampaignRejectedEmail(campaignId: string) {
  const campaign = await getCampaignWithAdvertiser(campaignId)
  if (!campaign?.advertiser?.email) return
  const advertiser = campaign.advertiser
  const { subject, html, text } = campaignRejectedEmail(advertiser.name || advertiser.email, campaign.title)
  await sendEmail({ to: advertiser.email, subject, html, text }).catch(() => {})
}

export async function sendCampaignLiveEmail(campaignId: string) {
  const campaign = await getCampaignWithAdvertiser(campaignId)
  if (!campaign?.advertiser?.email) return
  const advertiser = campaign.advertiser
  const { subject, html, text } = campaignLiveEmail(advertiser.name || advertiser.email, campaign.title)
  await sendEmail({ to: advertiser.email, subject, html, text }).catch(() => {})
}

export async function sendCampaignBudgetExhaustedEmail(campaignId: string) {
  const campaign = await getCampaignWithAdvertiser(campaignId)
  if (!campaign?.advertiser?.email) return
  const advertiser = campaign.advertiser
  const { subject, html, text } = campaignBudgetExhaustedEmail(
    advertiser.name || advertiser.email,
    campaign.title,
    campaign.budget_cents,
    campaign.spent_cents
  )
  await sendEmail({ to: advertiser.email, subject, html, text }).catch(() => {})
}

export async function maybeSendLowBalanceEmail(advertiserId: string, balanceCents: number) {
  if (balanceCents > LOW_BALANCE_THRESHOLD_CENTS) return

  const alreadySent = await kvGet(`${LOW_BALANCE_KEY_PREFIX}${advertiserId}`)
  if (alreadySent) return

  const advertiser = await getAdvertiserById(advertiserId)
  if (!advertiser?.email) return

  const { subject, html, text } = lowBalanceEmail(advertiser.name || advertiser.email, balanceCents)
  await sendEmail({ to: advertiser.email, subject, html, text }).catch(() => {})
  await kvSet(`${LOW_BALANCE_KEY_PREFIX}${advertiserId}`, '1', { ex: LOW_BALANCE_TTL_SECONDS })
}

export async function clearLowBalanceEmailFlag(advertiserId: string) {
  await kvSet(`${LOW_BALANCE_KEY_PREFIX}${advertiserId}`, '', { ex: 1 })
}

// Builder / creator emails

export async function sendBuilderWelcomeEmail(userId: string) {
  const email = await getUserEmailById(userId)
  if (!email) return
  const { subject, html, text } = builderWelcomeEmail(email)
  await sendEmail({ to: email, subject, html, text }).catch(() => {})
}

export async function sendPayoutRequestedEmail(userId: string, amountCents: number) {
  const email = await getUserEmailById(userId)
  if (!email) return
  const { subject, html, text } = payoutRequestedEmail(email, amountCents)
  await sendEmail({ to: email, subject, html, text }).catch(() => {})
}

export async function sendAdminPayoutRequestedEmail(userId: string, amountCents: number) {
  const email = await getUserEmailById(userId)
  const { subject, html, text } = adminPayoutRequestedEmail(email || 'Unknown user', amountCents)
  await sendEmail({ to: adminEmailRecipients(), subject, html, text }).catch(() => {})
}

export async function sendPayoutPaidEmail(userId: string, amountCents: number) {
  const email = await getUserEmailById(userId)
  if (!email) return
  const { subject, html, text } = payoutPaidEmail(email, amountCents)
  await sendEmail({ to: email, subject, html, text }).catch(() => {})
}

export async function sendPayoutRejectedEmail(userId: string, amountCents: number, reason: string) {
  const email = await getUserEmailById(userId)
  if (!email) return
  const { subject, html, text } = payoutRejectedEmail(email, amountCents, reason)
  await sendEmail({ to: email, subject, html, text }).catch(() => {})
}

export async function sendPayoutHoldEmail(userId: string, hold: boolean) {
  const email = await getUserEmailById(userId)
  if (!email) return
  const { subject, html, text } = payoutHoldEmail(email, hold)
  await sendEmail({ to: email, subject, html, text }).catch(() => {})
}

// Admin anomaly alert

export async function sendAdminAnomalyAlertEmail(
  type: string,
  severity: string,
  details: Record<string, unknown>
) {
  const { subject, html, text } = adminAnomalyAlertEmail(type, severity, JSON.stringify(details))
  await sendEmail({ to: adminEmailRecipients(), subject, html, text }).catch(() => {})
}

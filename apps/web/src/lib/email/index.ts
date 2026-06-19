const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.EMAIL_FROM ?? 'Prism <hello@goprism.dev>'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://goprism.dev'

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text: string
  replyTo?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set. Email not sent:', options.subject)
    return
  }

  const to = Array.isArray(options.to) ? options.to : [options.to]
  if (to.length === 0) return

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        reply_to: options.replyTo,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      console.error('Resend send failed:', body)
    }
  } catch (err) {
    console.error('Failed to send email:', err)
  }
}

export function getAdminEmails(): string[] {
  const raw = process.env.PRISM_ADMIN_EMAILS ?? ''
  return raw
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)
}

export function adminEmailRecipients(): string[] {
  const admins = getAdminEmails()
  return admins.length > 0 ? admins : ['hello@goprism.dev']
}

function emailWrapper(title: string, bodyHtml: string): { html: string; text: string } {
  const year = new Date().getFullYear()
  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="padding:32px 32px 16px;">
                <a href="${SITE_URL}" style="font-size:22px;font-weight:700;color:#7c3aed;text-decoration:none;">Prism</a>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 32px;color:#0f172a;font-size:16px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;background:#f8fafc;color:#64748b;font-size:13px;line-height:1.5;border-top:1px solid #e2e8f0;">
                <p style="margin:0 0 8px;">Prism — Get paid for every AI wait.</p>
                <p style="margin:0;">&copy; ${year} Prism. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const text = `${title}\n\n${bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}\n\nPrism — Get paid for every AI wait.\n${SITE_URL}`
  return { html, text }
}

export function advertiserOnboardingSubmittedEmail(name: string) {
  const { html, text } = emailWrapper(
    'Your Prism advertiser application was received',
    `<p>Hi ${name},</p>
     <p>Thanks for applying to advertise on Prism. We’ve received your application and will review it shortly.</p>
     <p>You’ll receive another email once your account is approved and you can launch campaigns.</p>`
  )
  return { subject: 'Your Prism advertiser application was received', html, text }
}

export function advertiserApprovedEmail(name: string) {
  const { html, text } = emailWrapper(
    'Your Prism advertiser account is active',
    `<p>Hi ${name},</p>
     <p>Your advertiser account has been approved. You can now create campaigns and top up your wallet.</p>
     <p style="margin:24px 0;">
       <a href="${SITE_URL}/advertiser/dashboard" style="display:inline-block;padding:14px 28px;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;">Go to advertiser dashboard</a>
     </p>`
  )
  return { subject: 'Your Prism advertiser account is active', html, text }
}

export function advertiserRejectedEmail(name: string) {
  const { html, text } = emailWrapper(
    'Your Prism advertiser application',
    `<p>Hi ${name},</p>
     <p>We’re unable to approve your advertiser account at this time. If you believe this was a mistake, please contact us at hello@goprism.dev.</p>`
  )
  return { subject: 'Update on your Prism advertiser application', html, text }
}

export function depositReceiptEmail(name: string, amountCents: number, balanceCents: number) {
  const amount = `$${(amountCents / 100).toFixed(2)}`
  const balance = `$${(balanceCents / 100).toFixed(2)}`
  const { html, text } = emailWrapper(
    'Deposit received',
    `<p>Hi ${name},</p>
     <p>We received your deposit of <strong>${amount}</strong>. Your wallet balance is now <strong>${balance}</strong>.</p>
     <p style="margin:24px 0;">
       <a href="${SITE_URL}/advertiser/dashboard" style="display:inline-block;padding:14px 28px;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;">View wallet</a>
     </p>`
  )
  return { subject: `Prism deposit received: ${amount}`, html, text }
}

export function campaignLiveEmail(name: string, campaignTitle: string) {
  const { html, text } = emailWrapper(
    'Your campaign is live',
    `<p>Hi ${name},</p>
     <p>Your campaign <strong>${campaignTitle}</strong> is now live and eligible to appear to Prism users.</p>
     <p style="margin:24px 0;">
       <a href="${SITE_URL}/advertiser/dashboard" style="display:inline-block;padding:14px 28px;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;">View campaign</a>
     </p>`
  )
  return { subject: `Your Prism campaign is live: ${campaignTitle}`, html, text }
}

export function campaignSubmittedEmail(name: string, campaignTitle: string) {
  const { html, text } = emailWrapper(
    'Your campaign is under review',
    `<p>Hi ${name},</p>
     <p>Your performance campaign <strong>${campaignTitle}</strong> has been submitted for review. We’ll notify you once it’s approved.</p>`
  )
  return { subject: `Campaign under review: ${campaignTitle}`, html, text }
}

export function campaignApprovedEmail(name: string, campaignTitle: string) {
  const { html, text } = emailWrapper(
    'Your campaign has been approved',
    `<p>Hi ${name},</p>
     <p>Your campaign <strong>${campaignTitle}</strong> has been approved and is now live.</p>
     <p style="margin:24px 0;">
       <a href="${SITE_URL}/advertiser/dashboard" style="display:inline-block;padding:14px 28px;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;">View campaign</a>
     </p>`
  )
  return { subject: `Campaign approved: ${campaignTitle}`, html, text }
}

export function campaignRejectedEmail(name: string, campaignTitle: string) {
  const { html, text } = emailWrapper(
    'Your campaign was not approved',
    `<p>Hi ${name},</p>
     <p>Your campaign <strong>${campaignTitle}</strong> was not approved. You can edit it and resubmit from your dashboard.</p>
     <p style="margin:24px 0;">
       <a href="${SITE_URL}/advertiser/dashboard" style="display:inline-block;padding:14px 28px;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;">Edit campaign</a>
     </p>`
  )
  return { subject: `Campaign not approved: ${campaignTitle}`, html, text }
}

export function campaignStatusChangedEmail(
  name: string,
  campaignTitle: string,
  status: 'paused' | 'resumed' | 'pending_review'
) {
  const labels: Record<typeof status, string> = {
    paused: 'paused',
    resumed: 'active again',
    pending_review: 'submitted for review',
  }
  const { html, text } = emailWrapper(
    `Your campaign is ${labels[status]}`,
    `<p>Hi ${name},</p>
     <p>Your campaign <strong>${campaignTitle}</strong> is now ${labels[status]}.</p>
     <p style="margin:24px 0;">
       <a href="${SITE_URL}/advertiser/dashboard" style="display:inline-block;padding:14px 28px;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;">View campaign</a>
     </p>`
  )
  return {
    subject: `Campaign ${labels[status]}: ${campaignTitle}`,
    html,
    text,
  }
}

export function campaignBudgetExhaustedEmail(
  name: string,
  campaignTitle: string,
  budgetCents: number,
  spentCents: number
) {
  const budget = `$${(budgetCents / 100).toFixed(2)}`
  const { html, text } = emailWrapper(
    'Your campaign budget is exhausted',
    `<p>Hi ${name},</p>
     <p>Your campaign <strong>${campaignTitle}</strong> has reached its budget of <strong>${budget}</strong> and is no longer serving.</p>
     <p style="margin:24px 0;">
       <a href="${SITE_URL}/advertiser/dashboard" style="display:inline-block;padding:14px 28px;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;">Top up or edit campaign</a>
     </p>`
  )
  return { subject: `Campaign budget exhausted: ${campaignTitle}`, html, text }
}

export function lowBalanceEmail(name: string, balanceCents: number) {
  const balance = `$${(balanceCents / 100).toFixed(2)}`
  const { html, text } = emailWrapper(
    'Your Prism wallet balance is low',
    `<p>Hi ${name},</p>
     <p>Your wallet balance is <strong>${balance}</strong>. Active campaigns may stop serving soon if the balance runs out.</p>
     <p style="margin:24px 0;">
       <a href="${SITE_URL}/advertiser/dashboard" style="display:inline-block;padding:14px 28px;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;">Top up wallet</a>
     </p>`
  )
  return { subject: 'Your Prism wallet balance is low', html, text }
}

export function builderWelcomeEmail(email: string) {
  const { html, text } = emailWrapper(
    'Welcome to Prism',
    `<p>Hi there,</p>
     <p>Welcome to Prism. Your creator account is ready — install the extension, add a payout method, and start earning every time an ad appears during an AI wait state.</p>
     <p style="margin:24px 0;">
       <a href="${SITE_URL}/dashboard" style="display:inline-block;padding:14px 28px;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;">Open dashboard</a>
     </p>`
  )
  return { subject: 'Welcome to Prism', html, text }
}

export function payoutRequestedEmail(email: string, amountCents: number) {
  const amount = `$${(amountCents / 100).toFixed(2)}`
  const { html, text } = emailWrapper(
    'Withdrawal request received',
    `<p>Hi there,</p>
     <p>We received your withdrawal request for <strong>${amount}</strong>. It is pending admin review and will be paid to your saved payout method.</p>
     <p>You’ll receive another email once it’s processed.</p>`
  )
  return { subject: `Withdrawal request received: ${amount}`, html, text }
}

export function payoutPaidEmail(email: string, amountCents: number) {
  const amount = `$${(amountCents / 100).toFixed(2)}`
  const { html, text } = emailWrapper(
    'Withdrawal sent',
    `<p>Hi there,</p>
     <p>Your withdrawal of <strong>${amount}</strong> has been approved and sent to your payout method.</p>
     <p>Depending on your provider, it may take 1–5 business days to arrive.</p>`
  )
  return { subject: `Withdrawal sent: ${amount}`, html, text }
}

export function payoutRejectedEmail(email: string, amountCents: number, reason: string) {
  const amount = `$${(amountCents / 100).toFixed(2)}`
  const { html, text } = emailWrapper(
    'Withdrawal not approved',
    `<p>Hi there,</p>
     <p>Your withdrawal request for <strong>${amount}</strong> was not approved.</p>
     <p><strong>Reason:</strong> ${reason}</p>
     <p>If you have questions, contact hello@goprism.dev.</p>`
  )
  return { subject: `Withdrawal not approved: ${amount}`, html, text }
}

export function payoutHoldEmail(email: string, hold: boolean) {
  const { html, text } = emailWrapper(
    hold ? 'Your withdrawals are on hold' : 'Your withdrawals are active again',
    hold
      ? `<p>Hi there,</p><p>Your payouts are currently on hold. Please check your dashboard or contact hello@goprism.dev for more information.</p>`
      : `<p>Hi there,</p><p>Your payout hold has been lifted. You can request withdrawals again.</p>`
  )
  return {
    subject: hold ? 'Your Prism withdrawals are on hold' : 'Your Prism withdrawals are active again',
    html,
    text,
  }
}

export function adminAdvertiserPendingEmail(advertiserName: string, email: string) {
  const { html, text } = emailWrapper(
    'New advertiser application',
    `<p>A new advertiser application is pending review.</p>
     <p><strong>Name:</strong> ${advertiserName}<br/><strong>Email:</strong> ${email}</p>
     <p style="margin:24px 0;">
       <a href="${SITE_URL}/admin/advertisers" style="display:inline-block;padding:14px 28px;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;">Review advertisers</a>
     </p>`
  )
  return { subject: 'New advertiser application pending review', html, text }
}

export function adminCampaignPendingEmail(advertiserName: string, campaignTitle: string) {
  const { html, text } = emailWrapper(
    'New campaign pending review',
    `<p>A new campaign is pending review.</p>
     <p><strong>Advertiser:</strong> ${advertiserName}<br/><strong>Campaign:</strong> ${campaignTitle}</p>
     <p style="margin:24px 0;">
       <a href="${SITE_URL}/admin/campaigns" style="display:inline-block;padding:14px 28px;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;">Review campaigns</a>
     </p>`
  )
  return { subject: `New campaign pending review: ${campaignTitle}`, html, text }
}

export function adminPayoutRequestedEmail(userEmail: string, amountCents: number) {
  const amount = `$${(amountCents / 100).toFixed(2)}`
  const { html, text } = emailWrapper(
    'New payout request',
    `<p>A new payout request is pending review.</p>
     <p><strong>User:</strong> ${userEmail}<br/><strong>Amount:</strong> ${amount}</p>
     <p style="margin:24px 0;">
       <a href="${SITE_URL}/admin/payouts" style="display:inline-block;padding:14px 28px;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;">Review payouts</a>
     </p>`
  )
  return { subject: `New payout request: ${amount}`, html, text }
}

export function adminAnomalyAlertEmail(type: string, severity: string, details: string) {
  const { html, text } = emailWrapper(
    `Anomaly alert: ${severity}`,
    `<p>A ${severity}-severity anomaly was detected.</p>
     <p><strong>Type:</strong> ${type}<br/><strong>Details:</strong> ${details}</p>
     <p style="margin:24px 0;">
       <a href="${SITE_URL}/admin/anomalies" style="display:inline-block;padding:14px 28px;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;">View anomalies</a>
     </p>`
  )
  return { subject: `[Prism anomaly] ${severity}: ${type}`, html, text }
}
